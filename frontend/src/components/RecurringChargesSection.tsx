import { useEffect, useState } from 'react';
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { add, createOutline, trashOutline } from 'ionicons/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addTemplateThunk,
  editTemplateThunk,
  loadTemplatesThunk,
  removeTemplateThunk,
} from '../store/templatesSlice';
import { refreshMonthThunk } from '../store/budgetSlice';
import { categoryColor, categoryIcon, categoryLabel, FIXED_CATEGORIES } from '../constants';
import type { FixedCharge, FixedChargeTemplate } from '../types';
import { formatMoney } from '../utils/format';

const RecurringChargesSection: React.FC = () => {
  const dispatch = useAppDispatch();
  const { templates, loading } = useAppSelector((s) => s.templates);
  const { budget, month, fixedCharges } = useAppSelector((s) => s.budget);
  const currency = budget?.currency ?? 'MGA';

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FixedChargeTemplate | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('5');
  const [category, setCategory] = useState<FixedCharge['category']>('logement');
  const [toDelete, setToDelete] = useState<FixedChargeTemplate | null>(null);
  const [converting, setConverting] = useState(false);
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);

  useEffect(() => {
    dispatch(loadTemplatesThunk());
  }, [dispatch]);

  // Charges du mois courant saisies « à l’ancienne » (sans gabarit) : on propose
  // de les transformer en charges récurrentes définies une fois.
  const orphanCharges = fixedCharges.filter((c) => !c.template_id);

  const convertOrphans = async () => {
    if (orphanCharges.length === 0) return;
    setConverting(true);
    for (const c of orphanCharges) {
      await dispatch(
        addTemplateThunk({
          name: c.name,
          default_amount: c.amount,
          due_day: c.due_day,
          category: c.category,
        }),
      );
    }
    setConverting(false);
    setToast({
      message: `${orphanCharges.length} charge(s) convertie(s) : elles reviendront automatiquement chaque mois.`,
      color: 'success',
    });
    dispatch(loadTemplatesThunk());
    refreshMonth();
  };

  const refreshMonth = () => {
    dispatch(refreshMonthThunk(month)).catch(() => undefined);
  };

  const resetForm = () => {
    setName('');
    setAmount('');
    setDueDay('5');
    setCategory('logement');
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (t: FixedChargeTemplate) => {
    setEditing(t);
    setName(t.name);
    setAmount(String(t.default_amount));
    setDueDay(String(t.due_day));
    setCategory(t.category);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const save = async () => {
    const numAmount = Number(amount);
    const numDay = Number(dueDay);
    if (name.trim().length === 0 || !numAmount || !numDay) return;

    const payload = {
      name: name.trim(),
      default_amount: numAmount,
      due_day: numDay,
      category,
    };

    let res;
    if (editing) {
      res = await dispatch(editTemplateThunk({ id: editing.id, payload }));
    } else {
      res = await dispatch(addTemplateThunk(payload));
    }
    if (res.meta.requestStatus === 'fulfilled') {
      setToast({
        message: editing ? 'Charge récurrente mise à jour.' : 'Charge récurrente ajoutée.',
        color: 'success',
      });
      refreshMonth();
      resetForm();
      setOpen(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const res = await dispatch(removeTemplateThunk(toDelete.id));
    if (res.meta.requestStatus === 'fulfilled') {
      setToast({ message: 'Charge supprimée.', color: 'success' });
      refreshMonth();
    }
    setToDelete(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>Charges fixes récurrentes</h3>
          <IonNote color="medium" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
            Loyer, factures, abonnements… Définies une fois, elles apparaissent
            automatiquement sur le tableau de bord chaque mois.
          </IonNote>
        </div>
        <IonButton size="small" onClick={openCreate}>
          <IonIcon icon={add} slot="start" /> Ajouter
        </IonButton>
      </div>

      {orphanCharges.length > 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            background: 'rgba(25, 118, 210, 0.07)',
            border: '1px solid rgba(25, 118, 210, 0.18)',
            borderRadius: 14,
            padding: '10px 12px',
            marginTop: 10,
          }}
        >
          <IonText style={{ flex: 1, minWidth: 200 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              {orphanCharges.length} charge{orphanCharges.length > 1 ? 's' : ''} saisie
              {orphanCharges.length > 1 ? 's' : ''} ce mois-ci ({month}) sans être
              récurrente{orphanCharges.length > 1 ? 's' : ''}.
            </p>
          </IonText>
          <IonButton size="small" onClick={convertOrphans} disabled={converting}>
            {converting ? 'Conversion...' : 'Convertir en récurrentes'}
          </IonButton>
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        {loading && templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <IonSpinner />
          </div>
        ) : templates.length === 0 ? (
          <IonText color="medium">
            <p style={{ fontSize: 13, textAlign: 'center' }}>
              Aucune charge récurrente pour le moment.
            </p>
          </IonText>
        ) : (
          templates.map((t) => {
            const color = categoryColor(t.category);
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 4px',
                  borderBottom: '1px solid var(--ion-color-step-150, #eef2f6)',
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: `${color}22`,
                    color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IonIcon icon={categoryIcon(t.category)} style={{ fontSize: 20 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.name}
                  </div>
                  <IonNote color="medium" style={{ fontSize: 12 }}>
                    {categoryLabel(t.category)} · le {t.due_day}
                  </IonNote>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{formatMoney(t.default_amount, currency)}</div>
                <IonIcon
                  icon={createOutline}
                  style={{ fontSize: 20, color: 'var(--ion-color-medium)' }}
                  onClick={() => openEdit(t)}
                  role="button"
                  aria-label={`Modifier ${t.name}`}
                />
                <IonIcon
                  icon={trashOutline}
                  style={{ fontSize: 20, color: 'var(--ion-color-danger)' }}
                  onClick={() => setToDelete(t)}
                  role="button"
                  aria-label={`Supprimer ${t.name}`}
                />
              </div>
            );
          })
        )}
      </div>

      <IonModal isOpen={open} onDidDismiss={closeModal}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{editing ? 'Modifier la charge' : 'Nouvelle charge récurrente'}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={closeModal}>Fermer</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem style={{ marginBottom: 12 }}>
            <IonInput
              label="Nom (loyer, électricité…)"
              labelPlacement="stacked"
              value={name}
              onIonInput={(e) => setName(String(e.detail.value ?? ''))}
            />
          </IonItem>
          <IonItem style={{ marginBottom: 12 }}>
            <IonInput
              type="number"
              label={`Montant par mois (${currency})`}
              labelPlacement="stacked"
              inputmode="numeric"
              value={amount}
              onIonInput={(e) => setAmount(String(e.detail.value ?? ''))}
            />
          </IonItem>
          <IonItem style={{ marginBottom: 12 }}>
            <IonInput
              type="number"
              label="Jour d'échéance (1-28)"
              labelPlacement="stacked"
              inputmode="numeric"
              min={1}
              max={28}
              value={dueDay}
              onIonInput={(e) => setDueDay(String(e.detail.value ?? ''))}
            />
          </IonItem>
          <IonItem style={{ marginBottom: 16 }}>
            <IonLabel>Catégorie</IonLabel>
            <IonSelect
              value={category}
              interface="action-sheet"
              onIonChange={(e) => setCategory(String(e.detail.value) as FixedCharge['category'])}
            >
              {FIXED_CATEGORIES.map((c) => (
                <IonSelectOption key={c.value} value={c.value}>
                  {c.label}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonButton expand="block" disabled={!name.trim() || !Number(amount)} onClick={save}>
            {editing ? 'Enregistrer' : 'Ajouter'}
          </IonButton>
        </IonContent>
      </IonModal>

      <IonAlert
        isOpen={!!toDelete}
        header="Supprimer cette charge ?"
        message={`« ${toDelete?.name} » sera retirée de tous les mois (passé et à venir).`}
        buttons={[
          { text: 'Annuler', role: 'cancel' },
          { text: 'Supprimer', role: 'destructive', handler: () => confirmDelete() },
        ]}
      />
      <IonToast
        isOpen={!!toast}
        message={toast?.message ?? ''}
        color={toast?.color}
        duration={2200}
        onDidDismiss={() => setToast(null)}
      />
    </div>
  );
};

export default RecurringChargesSection;
