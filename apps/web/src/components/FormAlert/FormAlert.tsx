import { useEffect, useRef } from 'react';
import styles from './FormAlert.module.scss';

export function FormAlert({
  message,
  focus = true,
}: {
  message: string;
  focus?: boolean;
}): React.JSX.Element {
  const alertRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (focus) {
      alertRef.current?.focus();
    }
  }, [message, focus]);

  return (
    <p ref={alertRef} className={styles.alert} role="alert" tabIndex={-1}>
      {message}
    </p>
  );
}
