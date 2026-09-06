import { IonIcon, IonText } from '@ionic/react';
import { cloudOfflineOutline } from 'ionicons/icons';

const EmptyState: React.FC<{
  icon?: string;
  title: string;
  subtitle?: string;
}> = ({ icon = cloudOfflineOutline, title, subtitle }) => {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <IonIcon icon={icon} style={{ fontSize: 48, color: 'var(--ion-color-medium)' }} />
      <IonText>
        <p style={{ fontWeight: 600, margin: '8px 0 4px' }}>{title}</p>
      </IonText>
      {subtitle ? (
        <IonText color="medium">
          <small>{subtitle}</small>
        </IonText>
      ) : null}
    </div>
  );
};

export default EmptyState;