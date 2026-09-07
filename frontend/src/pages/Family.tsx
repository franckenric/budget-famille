import { useEffect, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
  IonToast,
  IonText,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import {
  copyOutline,
  createOutline,
  ellipsisVertical,
  personAddOutline,
  peopleOutline,
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
            <div className="tile-group">
              <EmptyState
                icon="people-outline"
                title="Aucune famille"
                subtitle="Créez une famille et partagez votre budget, ou rejoignez-en une avec un code."
              />
            </div>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            <div className="hero-card family-header">
              <div className="hero-inner">
                <div className="hero-k" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IonIcon icon={peopleOutline} /> Famille
                </div>
                <div className="family-name">{family.name}</div>
                <div className="hero-k" style={{ color: 'rgba(255,255,255,0.82)' }}>
                  {members.length} membre{members.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div className="invite-card" onClick={copyCode}>
              <IonIcon icon={copyOutline} style={{ fontSize: 20, color: 'var(--ion-color-primary)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ion-color-medium)' }}>
                  Code d'invitation
                </div>
                <div className="invite-code">{family.invite_code}</div>
              </div>
              <IonNote color="primary" className="invite-copy" style={{ fontWeight: 600 }}>
                Copier
              </IonNote>
            </div>

            <div className="tile-group">
              {members.map((m) => (
                <div key={m.user_id} className="member-row">
                  <div className="avatar-gradient">
                    {(m.full_name ?? m.email ?? '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="member-name">{m.full_name ?? m.email}</div>
                    <div className="member-mail">{m.email}</div>
                  </div>
                  <span className={`role-badge ${m.role === 'admin' ? 'admin' : ''}`}>{m.role}</span>
                  {isAdmin && m.user_id !== user?.id ? (
                    <IonIcon
                      icon={ellipsisVertical}
                      style={{ fontSize: 20, color: 'var(--ion-color-medium)' }}
                      onClick={() => promote(m)}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="tile-group" style={{ padding: '14px 16px' }}>
              <IonNote color="medium" style={{ fontSize: 13, lineHeight: 1.5 }}>
                Fournissez l'esprit d'équipe : chaque membre a son propre budget, les
                montants sont additionnés pour suivre la dépense globale.
              </IonNote>
            </div>
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