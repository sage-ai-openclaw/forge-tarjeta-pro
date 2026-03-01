import { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { PreferencesPage } from './pages/PreferencesPage';
import { MyPromotionsPage } from './pages/MyPromotionsPage';
import { NotificationsPage } from './pages/NotificationsPage';

type Page = 'dashboard' | 'my-promotions' | 'preferences' | 'notifications';

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
        userId={userId}
        onNavigateToMyPromotions={() => navigateTo('my-promotions')}
        onNavigateToPreferences={() => navigateTo('preferences')}
        onNavigateToNotifications={() => navigateTo('notifications')}
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
        onNavigateToDashboard={() => navigateTo('dashboard')}
      />
    );
  }

  if (currentPage === 'notifications') {
    return (
      <NotificationsPage
        userId={userId}
        onNavigateToDashboard={() => navigateTo('dashboard')}
      />
    );
  }

  return null;
}

export default App;
