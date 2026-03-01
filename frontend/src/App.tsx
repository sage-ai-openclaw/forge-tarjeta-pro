import { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { PreferencesPage } from './pages/PreferencesPage';
import { MyPromotionsPage } from './pages/MyPromotionsPage';

type Page = 'dashboard' | 'my-promotions' | 'preferences';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [userId] = useState(1); // Demo user ID

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // Wrap Dashboard with navigation
  if (currentPage === 'dashboard') {
    return (
      <Dashboard 
        onNavigateToMyPromotions={() => navigateTo('my-promotions')}
        onNavigateToPreferences={() => navigateTo('preferences')}
      />
    );
  }

  if (currentPage === 'my-promotions') {
    return (
      <MyPromotionsPage
        userId={userId}
        onNavigateToPreferences={() => navigateTo('preferences')}
        onNavigateToDashboard={() => navigateTo('dashboard')}
      />
    );
  }

  if (currentPage === 'preferences') {
    return (
      <PreferencesPage 
        userId={userId}
      />
    );
  }

  return null;
}

export default App;
