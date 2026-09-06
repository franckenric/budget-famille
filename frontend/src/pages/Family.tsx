import { useEffect, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
  IonToast,
  IonAvatar,
  IonText,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import {
  copyOutline,
  createOutline,
  ellipsisVertical,
  personAddOutline,
} from 'ionicons/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadMeThunk } from '../store/authSlice';
import { createFamily, fetchMyFamily, joinFamily, updateMemberRole } from '../services/endpoints';
import type { Family, FamilyMember } from '../types';
import EmptyState from '../components/EmptyState';

const Family: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none');
  const [family, setFamily] = useState<Family | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);

  const loadFamily = async () => {
    try {
      const f = await fetchMyFamily();
      setFamily(f.id ? f : null);
    } catch {
      setFamily(null);
    }
  };

  useEffect(() => {
    loadFamily();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createFamily(name.trim());
      setToast({ message: `Famille "${name.trim()}" créée.`, color: 'success' });
      setMode('none');
      setName('');
      await loadFamily();
      dispatch(loadMeThunk());
    } catch (err) {
      setToast({ message: (err as Error).message, color: 'danger' });
    }
    setLoading(false);
  };

  const join = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const f = await joinFamily(code.trim());
      setToast({ message: `Vous avez rejoint "${f.name}".`, color: 'success' });
      setMode('none');
      setCode('');
      await loadFamily();
      dispatch(loadMeThunk());
    } catch (err) {
      setToast({ message: (err as Error).message, color: 'danger' });
    }
    setLoading(false);
  };

  const copyCode = async () => {
    if (!family?.invite_code) return;
    const text = family.invite_code;
    try {
      if ('clipboard' in navigator) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('clipboard unavailable');
      }
      setToast({ message: 'Code copié.', color: 'success' });
    } catch {
      setToast({ message: `Code d'invitation : ${text}`, color: 'medium' });
    }
  };

  const promote = async (m: FamilyMember) => {
    const next = m.role === 'admin' ? 'member' : 'admin';
    try {
      if (m.user_id) await updateMemberRole(m.user_id, next);
      setToast({ message: `Rôle mis à jour (${next}).`, color: 'success' });
      await loadFamily();
    } catch (err) {
      setToast({ message: (err as Error).message, color: 'danger' });
    }
  };

  const isAdmin = user?.family?.owner_user_id === user?.id || user?.role_name === 'admin';
  const members = family?.members ?? [];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Famille</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!family ? (
          <>
            <EmptyState
              icon="people-outline"
              title="Aucune famille"
              subtitle="Créez une famille et partagez votre budget, ou rejoignez-en une avec un code."
            />
            {mode === 'create' ? (
              <IonCard>
                <IonCardContent>
                  <IonItem style={{ marginBottom: 12 }}>
                    <IonInput
                      label="Nom de la famille"
                      labelPlacement="stacked"
                      value={name}
                      onIonInput={(e) => setName(String(e.detail.value ?? ''))}
                    />
                  </IonItem>
                  <IonButton expand="block" disabled={!name.trim() || loading} onClick={create}>
                    Créer la famille
                  </IonButton>
                </IonCardContent>
              </IonCard>
            ) : mode === 'join' ? (
              <IonCard>
                <IonCardContent>
                  <IonItem style={{ marginBottom: 12 }}>
                    <IonInput
                      label="Code d'invitation"
                      labelPlacement="stacked"
                      value={code}
                      onIonInput={(e) => setCode(String(e.detail.value ?? ''))}
                    />
                  </IonItem>
                  <IonButton expand="block" disabled={!code.trim() || loading} onClick={join}>
                    Rejoindre
                  </IonButton>
                </IonCardContent>
              </IonCard>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <IonButton expand="block" onClick={() => setMode('create')}>
                  <IonIcon icon={createOutline} slot="start" /> Créer une famille
                </IonButton>
                <IonButton expand="block" fill="outline" onClick={() => setMode('join')}>
                  <IonIcon icon={personAddOutline} slot="start" /> Rejoindre avec un code
                </IonButton>
              </div>
            )}
          </>
        ) : (
          <>
            <IonItem lines="none" style={{ marginBottom: 8 }}>
              <IonLabel>
                <h2 style={{ margin: 0 }}>{family.name}</h2>
                <IonNote color="medium">{members.length} membre(s)</IonNote>
              </IonLabel>
            </IonItem>

            <IonItem lines="none" button onClick={copyCode} style={{ marginBottom: 12 }}>
              <IonIcon icon={copyOutline} slot="start" color="primary" />
              <IonLabel>
                Code d'invitation : <b>{family.invite_code}</b>
              </IonLabel>
              <IonNote color="medium" slot="end">
                Copier
              </IonNote>
            </IonItem>

            <IonList inset>
              {members.map((m) => (
                <IonItem key={m.user_id}>
                  <IonAvatar slot="start" style={{ width: 32, height: 32, background: 'var(--ion-color-primary)' }}>
                    <span style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
                      {(m.full_name ?? m.email ?? '?')[0].toUpperCase()}
                    </span>
                  </IonAvatar>
                  <IonLabel>
                    <h2 style={{ margin: 0 }}>{m.full_name ?? m.email}</h2>
                    <IonNote color="medium">
                      {m.email} · {m.role}
                    </IonNote>
                  </IonLabel>
                  {isAdmin && m.user_id !== user?.id ? (
                    <IonIcon
                      icon={ellipsisVertical}
                      slot="end"
                      style={{ fontSize: 20 }}
                      onClick={() => promote(m)}
                    />
                  ) : null}
                </IonItem>
              ))}
            </IonList>

            <IonItem lines="none">
              <IonLabel color="medium">
                <IonNote>
                  Fournissez l'esprit d'équipe : chaque membre a son propre budget,
                  les montants sont additionnés pour suivre la dépense globale.
                </IonNote>
              </IonLabel>
            </IonItem>
          </>
        )}

        <IonToast
          isOpen={!!toast}
          message={toast?.message ?? ''}
          color={toast?.color}
          duration={2200}
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Family;