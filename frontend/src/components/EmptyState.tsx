import { IonIcon, IonText } from '@ionic/react';
import { cloudOfflineOutline } from 'ionicons/icons';

const EmptyState: React.FC<{
  icon?: string;
  title: string;
  subtitle?: string;
}> = ({ icon = cloudOfflineOutline, title, subtitle }) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <IonIcon icon={icon} />
      </div>
      <IonText>
        <p className="empty-title">{title}</p>
      </IonText>
      {subtitle ? (
        <IonText color="medium">
          <p className="empty-sub">{subtitle}</p>
        </IonText>
      ) : null}
    </div>
  );
};

export default EmptyState;
