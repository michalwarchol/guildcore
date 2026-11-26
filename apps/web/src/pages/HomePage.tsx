import { Header } from '../components/Header';
import styles from './HomePage.module.scss';

export function HomePage(): React.JSX.Element {
  return (
    <main className={styles.page}>
      <Header />
    </main>
  );
}
