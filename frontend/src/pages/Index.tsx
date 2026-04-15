import { CampaignProvider, useCampaign } from '@/context/CampaignContext';
import PageTransition from '@/components/PageTransition';
import LandingPage from '@/pages/LandingPage';
import SpinPage from '@/pages/SpinPage';
import RewardPage from '@/pages/RewardPage';
import UserFormPage from '@/pages/UserFormPage';
import ConfirmationPage from '@/pages/ConfirmationPage';

const FlowRouter = () => {
  const { step } = useCampaign();

  const pages: Record<string, React.ReactNode> = {
    landing: <LandingPage />,
    spin: <SpinPage />,
    reward: <RewardPage />,
    form: <UserFormPage />,
    confirmation: <ConfirmationPage />,
  };

  return (
    <main id="main-content">
      <PageTransition keyProp={step}>
        {pages[step]}
      </PageTransition>
    </main>
  );
};

const Index = () => (
  <CampaignProvider>
    <FlowRouter />
  </CampaignProvider>
);

export default Index;
