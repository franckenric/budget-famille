import uuid

from app.utils import camel_to_snake, generate_uuid


def test_camel_to_snake():
    assert camel_to_snake("HelloWorld") == "hello_world"
    assert camel_to_snake("FixedCharges") == "fixed_charges"
    assert camel_to_snake("VariableExpenses") == "variable_expenses"
    assert camel_to_snake("APIEndpoint") == "a_p_i_endpoint"


def test_generate_uuid():
    value = generate_uuid()
    parsed = uuid.UUID(value)
    assert str(parsed) == value
    assert len(value) == 36