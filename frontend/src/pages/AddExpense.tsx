import { useEffect, useMemo, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  IonToast,
  IonAlert,
  IonCheckbox,
  IonModal,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import { add, cameraOutline, imageOutline, trashOutline } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addExpenseThunk, editExpenseThunk, loadMonthThunk } from '../store/budgetSlice';
import { VARIABLE_CATEGORIES } from '../constants';
import { formatMoney, nowISO, toISODate, uid } from '../utils/format';
import type { VariableExpense, ExpenseDetail } from '../types';
import { isOnline } from '../services/connectivity';
import { offlineUpsertExpense } from '../services/sync';

const emptyDetail = (): ExpenseDetail => ({ description: '', quantity: 1, unit_price: 0 });

const AddExpense: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useIonRouter();
  const { month, budget, expenses } = useAppSelector((s) => s.budget);
  const currency = budget?.currency ?? 'MGA';

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('alimentation');
  const [date, setDate] = useState(toISODate(new Date()));
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [showPhotoError, setShowPhotoError] = useState(false);
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);
  const [editing, setEditing] = useState<VariableExpense | null>(null);
  const [showDate, setShowDate] = useState(false);

  const [mode, setMode] = useState<'simple' | 'detailed'>('simple');
  const [details, setDetails] = useState<ExpenseDetail[]>([emptyDetail()]);

  const editId = useMemo(() => new URLSearchParams(window.location.search).get('edit'), []);

  useEffect(() => {
    if (editId) {
      const found = expenses.find((e) => e.id === editId);
      if (found) {
        setEditing(found);
        setTitle(found.title);
        setAmount(String(found.amount));
        setCategory(found.category);
        setDate(found.expense_date);
        setDescription(found.description ?? '');
        setIsRecurring(!!found.is_recurring);
        setPhoto(found.photo_url ?? null);
        if (found.details && found.details.length > 0) {
          setMode('detailed');
          setDetails(found.details);
        }
      }
    }
  }, [editId, expenses]);

  const detailsTotal = details.reduce((s, d) => s + d.quantity * d.unit_price, 0);
  const numAmount = Number(amount);
  const effectiveAmount = mode === 'detailed' ? detailsTotal : numAmount;
  const canSubmit = title.trim().length > 0 && effectiveAmount > 0 && budget != null;

  const updateDetail = (index: number, field: keyof ExpenseDetail, value: string | number) => {
    setDetails((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  const addDetail = () => setDetails((prev) => [...prev, emptyDetail()]);

  const removeDetail = (index: number) => {
    if (details.length <= 1) return;
    setDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setCategory('alimentation');
    setDate(toISODate(new Date()));
    setDescription('');
    setIsRecurring(false);
    setPhoto(null);
    setEditing(null);
    setMode('simple');
    setDetails([emptyDetail()]);
  };

  const takePhoto = async () => {
    try {
      const mod = await import('@capacitor/camera');
      const res = await mod.Camera.getPhoto({
        resultType: mod.CameraResultType.Uri,
        source: mod.CameraSource.Camera,
        quality: 70,
      });
      setPhoto(res.webPath ?? null);
    } catch {
      setShowPhotoError(true);
    }
  };

  const save = async () => {
    if (!canSubmit || !budget) return;
    const base: Partial<VariableExpense> = {
      title: title.trim(),
      amount: effectiveAmount,
      category: category as VariableExpense['category'],
      expense_date: date,
      description: description.trim() || undefined,
      is_recurring: isRecurring,
      photo_url: photo ?? undefined,
      details: mode === 'detailed' ? details.filter((d) => d.description.trim()) : undefined,
    };

    if (isOnline()) {
      if (editing) {
        const res = await dispatch(editExpenseThunk({ id: editing.id, payload: base }));
        if (res.meta.requestStatus === 'fulfilled') {
          setToast({ message: 'Dépense mise à jour.', color: 'success' });
        }
      } else {
        const res = await dispatch(addExpenseThunk({ ...base, budget_id: budget.id }));
        if (res.meta.requestStatus === 'fulfilled') {
          setToast({ message: 'Dépense enregistrée.', color: 'success' });
          resetForm();
        }
      }
    } else {
      const expense: VariableExpense = {
        id: editing?.id ?? uid(),
        budget_id: budget.id,
        user_id: undefined,
        title: base.title!,
        amount: base.amount!,
        expense_date: base.expense_date!,
        category: base.category!,
        description: base.description,
        photo_url: base.photo_url,
        is_recurring: base.is_recurring,
        details: base.details,
        created_at: editing?.created_at ?? nowISO(),
        updated_at: nowISO(),
      };
      await offlineUpsertExpense(expense);
      setToast({ message: 'Enregistré hors ligne (synchronisation en attente).', color: 'warning' });
      if (!editing) resetForm();
    }

    dispatch(loadMonthThunk(month));
    setTimeout(() => router.push('/tabs/expenses'), 400);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/expenses" />
          </IonButtons>
          <IonTitle>{editing ? 'Modifier la dépense' : 'Nouvelle dépense'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem style={{ marginBottom: 12 }}>
          <IonInput
            label="Intitulé"
            labelPlacement="stacked"
            value={title}
            onIonInput={(e) => setTitle(String(e.detail.value ?? ''))}
          />
        </IonItem>

        {/* Mode toggle */}
        <div style={{ marginBottom: 12 }}>
          <IonSegment value={mode} onIonChange={(e) => setMode(e.detail.value as 'simple' | 'detailed')}>
            <IonSegmentButton value="simple">
              <IonLabel>Montant unique</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="detailed">
              <IonLabel>Détail (lignes)</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>

        {/* Simple mode: single amount input */}
        {mode === 'simple' && (
          <IonItem style={{ marginBottom: 12 }}>
            <IonInput
              type="number"
              label={`Montant (${currency})`}
              labelPlacement="stacked"
              inputmode="numeric"
              value={amount}
              onIonInput={(e) => setAmount(String(e.detail.value ?? ''))}
            />
          </IonItem>
        )}

        {/* Detailed mode: line items */}
        {mode === 'detailed' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--ion-color-medium)' }}>
              Détail des postes
            </div>
            {details.map((d, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--ion-color-step-100, rgba(0,0,0,0.04))',
                  borderRadius: 10,
                  padding: '10px 12px',
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <IonInput
                    placeholder="Description"
                    value={d.description}
                    onIonInput={(e) => updateDetail(i, 'description', String(e.detail.value ?? ''))}
                    style={{ flex: 2 }}
                  />
                  {details.length > 1 && (
                    <IonButton fill="clear" color="danger" onClick={() => removeDetail(i)} style={{ margin: 0, minWidth: 36 }}>
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <IonInput
                    type="number"
                    inputmode="numeric"
                    placeholder="Qté"
                    value={d.quantity || ''}
                    onIonInput={(e) => updateDetail(i, 'quantity', Number(e.detail.value) || 0)}
                    style={{ flex: 1 }}
                  />
                  <IonInput
                    type="number"
                    inputmode="numeric"
                    placeholder={`Prix unitaire (${currency})`}
                    value={d.unit_price || ''}
                    onIonInput={(e) => updateDetail(i, 'unit_price', Number(e.detail.value) || 0)}
                    style={{ flex: 2 }}
                  />
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 13, fontWeight: 600, color: 'var(--ion-color-dark)' }}>
                    {formatMoney(d.quantity * d.unit_price, currency)}
                  </div>
                </div>
              </div>
            ))}
            <IonButton fill="clear" size="small" onClick={addDetail} style={{ margin: 0, '--padding-start': 0 }}>
              <IonIcon icon={add} slot="start" /> Ajouter une ligne
            </IonButton>
            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, marginTop: 8, color: '#f97316' }}>
              Total : {formatMoney(detailsTotal, currency)}
            </div>
          </div>
        )}

        <IonItem style={{ marginBottom: 12 }}>
          <IonLabel>Catégorie</IonLabel>
          <IonSelect
            value={category}
            interface="action-sheet"
            onIonChange={(e) => setCategory(String(e.detail.value))}
          >
            {VARIABLE_CATEGORIES.map((c) => (
              <IonSelectOption key={c.value} value={c.value}>
                {c.label}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        <IonItem button onClick={() => setShowDate(true)} style={{ marginBottom: 12 }}>
          <IonLabel>Date</IonLabel>
          <IonLabel slot="end" color="medium">
            {date}
          </IonLabel>
        </IonItem>

        <IonItem style={{ marginBottom: 12 }}>
          <IonTextarea
            label="Description (optionnelle)"
            labelPlacement="stacked"
            rows={2}
            value={description}
            onIonInput={(e) => setDescription(String(e.detail.value ?? ''))}
          />
        </IonItem>

        <IonItem lines="none" style={{ marginBottom: 12 }}>
          <IonLabel>Dépense récurrente</IonLabel>
          <IonCheckbox
            slot="end"
            checked={isRecurring}
            onIonChange={(e) => setIsRecurring(e.detail.checked)}
          />
        </IonItem>

        <div style={{ marginBottom: 16 }}>
          {photo ? (
            <div style={{ position: 'relative', width: '100%' }}>
              <img src={photo} alt="Justificatif" style={{ width: '100%', borderRadius: 12, maxHeight: 220, objectFit: 'cover' }} />
              <IonButton
                size="small"
                fill="clear"
                style={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => setPhoto(null)}
              >
                <IonIcon icon={trashOutline} slot="icon-only" />
              </IonButton>
            </div>
          ) : (
            <IonButton expand="block" fill="outline" onClick={takePhoto}>
              <IonIcon icon={photo ? imageOutline : cameraOutline} slot="start" />
              {photo ? 'Photo prise' : 'Ajouter une photo (justificatif)'}
            </IonButton>
          )}
        </div>

        {effectiveAmount > 0 ? (
          <IonLabel style={{ textAlign: 'center', display: 'block', marginBottom: 12 }}>
            <small>{formatMoney(effectiveAmount, currency)}</small>
          </IonLabel>
        ) : null}

        <IonButton
          expand="block"
          disabled={!canSubmit}
          onClick={save}
        >
          {editing ? 'Enregistrer les modifications' : 'Ajouter la dépense'}
        </IonButton>

        <IonModal isOpen={showDate} onDidDismiss={() => setShowDate(false)}>
          <IonDatetime
            value={date}
            onIonChange={(e) => {
              setDate(String(e.detail.value ?? '').slice(0, 10));
              setShowDate(false);
            }}
            locale="fr-FR"
          />
        </IonModal>

        <IonAlert
          isOpen={showPhotoError}
          header="Appareil photo indisponible"
          message="Impossible d'accéder à la caméra sur cet appareil."
          buttons={['OK']}
          onDidDismiss={() => setShowPhotoError(false)}
        />
        <IonToast
          isOpen={!!toast}
          message={toast?.message ?? ''}
          color={toast?.color}
          duration={2000}
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default AddExpense;
