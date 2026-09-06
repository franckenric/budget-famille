import ast
from datetime import date, datetime, timedelta
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import and_, asc, desc, extract, func, or_
from sqlalchemy.orm import Session, joinedload, load_only, with_loader_criteria

from app.db.base_class import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


def parse_json_list(value, default=None):
    if value is None or value == "" or value == "[]":
        return default or []
    if isinstance(value, list):
        return value
    try:
        return ast.literal_eval(value)
    except (ValueError, SyntaxError):
        return default or []


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    # ------------------------------------------------------------------
    # Helpers filtres
    # ------------------------------------------------------------------

    def build_filter_condition(self, attribute, operator: str, value: Any):
        if operator == "==":
            return attribute == value
        if operator == "!=":
            return attribute != value
        if operator == ">":
            return attribute > value
        if operator == ">=":
            return attribute >= value
        if operator == "<":
            return attribute < value
        if operator == "<=":
            return attribute <= value
        if operator == "like":
            return attribute.like("%" + str(value) + "%")
        if operator == "month":
            return extract("month", attribute) == value if value is not None else None
        if operator == "year":
            return extract("year", attribute) == value if value is not None else None
        if operator == "week":
            return extract("week", attribute) == value if value is not None else None
        if operator == "date":
            date_value = datetime.strptime(str(value), "%Y-%m-%d").date()
            return func.date(attribute) == date_value
        if operator == "between_date":
            start, end = str(value).split(",")
            return attribute.between(
                datetime.strptime(start.strip(), "%Y-%m-%d").date(),
                datetime.strptime(end.strip(), "%Y-%m-%d").date(),
            )
        if operator == "isNull":
            return attribute.is_(None)
        if operator == "isNotNull":
            return attribute.isnot(None)
        if operator == "isTrue":
            return attribute.is_(True)
        if operator == "isFalse":
            return attribute.is_(False)
        if operator == "in":
            return attribute.in_(value) if isinstance(value, list) else attribute.in_([value])
        if operator == "notIn":
            return attribute.notin_(value) if isinstance(value, list) else attribute.notin_([value])
        if operator == "last_24h":
            return attribute.between(datetime.now() - timedelta(hours=24), datetime.now())
        return None

    def get_key_parts(self, key):
        return key.split(".")

    def get_attrs(self, parent_model, current_idx, keys, operators):
        previous_model = parent_model
        attrs = []
        for i in range(len(keys)):
            if i < len(keys) - 1:
                attr = getattr(previous_model, keys[i])
                previous_model = attr.property.mapper.class_
                attrs.append((attr, False))
            else:
                idx = current_idx["value"]
                operator = operators[idx]
                filter_condition = self.build_filter_condition(
                    getattr(previous_model, keys[i]), operator, None
                )
                current_idx["value"] = idx + 1
                attrs.append((filter_condition, False))
        return attrs

    def get_cond_reccur(self, attrs, condition_operator=and_):
        attrs.reverse()
        cond = None
        for i in range(len(attrs)):
            attr, _ = attrs[i]
            if i == 0:
                cond = attr
            else:
                try:
                    cond = attr.has(cond)
                except Exception:
                    cond = attr.any(cond)
        return cond

    def sub_get_condition(self, condition):
        keys = self.get_key_parts(condition["key"])
        operators = [condition.get("operator", "==")]
        current_idx = {"value": 0}
        attrs = self.get_attrs(self.model, current_idx, keys, operators)
        return self.get_cond_reccur(attrs=attrs)

    def get_condition(self, condition):
        """Construit une condition SQL à partir d'un dict {key, operator, value}."""
        keys = self.get_key_parts(condition["key"])
        previous_model = self.model
        for i in range(len(keys) - 1):
            attr = getattr(previous_model, keys[i])
            previous_model = attr.property.mapper.class_
            parent_attr = attr

        last_key = keys[-1]
        operator = condition.get("operator", "==")
        value = condition.get("value")

        if value == "None" or value is None and operator in ("==",):
            operator = "isNull"
            value = None

        # pour les clés profondes : has() / any() sur le parent
        if len(keys) == 1:
            return self.build_filter_condition(
                getattr(self.model, last_key), operator, value
            )
        child_col = getattr(previous_model, last_key)
        child_cond = self.build_filter_condition(child_col, operator, value)
        return parent_attr.has(child_cond)

    def get_full_condition(self, where=None, include_deleted=False):
        if not include_deleted:
            where = list(where or [])
            where.append({"key": "deleted_at", "operator": "isNull"})
        if not where:
            return None
        conditions = []
        for parent_condition in where:
            if isinstance(parent_condition, list):
                or_conditions = []
                for condition in parent_condition:
                    cond = self.get_condition(condition)
                    if cond is not None:
                        or_conditions.append(cond)
                if or_conditions:
                    conditions.append(or_(*or_conditions))
            else:
                cond = self.get_condition(parent_condition)
                if cond is not None:
                    conditions.append(cond)
        return and_(*conditions) if conditions else None

    # ------------------------------------------------------------------
    # Relations loading
    # ------------------------------------------------------------------

    def get_all_relations(self, relations: List[str]):
        options = []
        for relation in relations:
            parts = relation.split(".")
            result = None
            for part in parts:
                if "{" in part:
                    rel_name, cols = part.split("{", 1)
                    cols = cols.rstrip("}").split(",")
                else:
                    rel_name, cols = part, []
                attr = getattr(self.model if result is None else result.property.mapper.class_, rel_name)
                result = (result.joinedload(attr) if result else joinedload(attr))
                target = attr.property.mapper.class_
                if cols:
                    result = result.load_only(*[getattr(target, c) for c in cols])
                else:
                    result = result.load_only(getattr(target, "id"))
            options.append(result)
        return options

    def apply_where_relation(self, query, where_relation=None):
        return query

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    def get(self, db: Session, id: Any, relations=None, include_deleted=False):
        query = db.query(self.model).filter(self.model.id == id)
        if relations:
            query = query.options(*self.get_all_relations(relations))
        return query.first()

    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[ModelType]:
        return db.query(self.model).filter(getattr(self.model, field) == value).first()

    def get_first_where_array(
        self,
        db: Session,
        *,
        where=None,
        where_relation=None,
        relations=None,
        base_columns=None,
        include_deleted=False,
    ) -> Optional[ModelType]:
        query = db.query(self.model)
        conditions = self.get_full_condition(where, include_deleted=include_deleted)
        if conditions is not None:
            query = query.filter(conditions)
        if base_columns:
            query = query.options(*[load_only(getattr(self.model, c)) for c in base_columns])
        if relations:
            query = query.options(*self.get_all_relations(relations))
        return query.first()

    def get_multi_where_array(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "id",
        order: str = "ASC",
        where=None,
        where_relation=None,
        base_columns=None,
        relations=None,
        include_deleted=False,
    ) -> List[ModelType]:
        query = db.query(self.model)
        conditions = self.get_full_condition(where, include_deleted=include_deleted)
        if conditions is not None:
            query = query.filter(conditions)
        if base_columns:
            query = query.options(*[load_only(getattr(self.model, c)) for c in base_columns])
        if relations:
            query = query.options(*self.get_all_relations(relations))
        order_function = desc if str(order).upper() == "DESC" else asc
        if "." in order_by:
            attrs = order_by.split(".")
            col = getattr(getattr(self.model, attrs[0]).property.mapper.class_, attrs[-1])
        else:
            col = getattr(self.model, order_by)
        return (
            query.order_by(order_function(col), desc(self.model.id))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_count_where_array(self, db: Session, *, where=None, include_deleted=False) -> int:
        query = db.query(self.model.id)
        conditions = self.get_full_condition(where, include_deleted=include_deleted)
        if conditions is not None:
            query = query.filter(conditions)
        return query.count()

    # ------------------------------------------------------------------
    # CREATE / UPDATE / DELETE
    # ------------------------------------------------------------------

    def create(self, db: Session, *, obj_in: CreateSchemaType, commit: bool = True, refresh: bool = True) -> ModelType:
        obj_in_data = obj_in.model_dump(exclude_unset=True)
        if "password" in obj_in_data:
            obj_in_data.pop("password")
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        if commit:
            db.commit()
        if refresh:
            db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: ModelType, obj_in: Union[UpdateSchemaType, Dict[str, Any]], commit: bool = True) -> ModelType:
        obj_data = jsonable_encoder(db_obj)
        update_data = obj_in.model_dump(exclude_unset=True) if not isinstance(obj_in, dict) else obj_in
        if "password" in update_data:
            update_data.pop("password")
        update_data["updated_at"] = func.now()
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        if commit:
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: Any, commit: bool = True) -> ModelType:
        obj = db.get(self.model, id)
        if not obj:
            return None
        obj.deleted_at = func.now()
        db.add(obj)
        if commit:
            db.commit()
        return obj