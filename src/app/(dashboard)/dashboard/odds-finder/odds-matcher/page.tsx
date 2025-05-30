import TabBar from '@/components/OddsMatcher/TabBar';
import BookExchangeControls from '@/components/OddsMatcher/BookExchangeControls';

export default function OddsMatcherPage() {
  return <div style={{padding:32}}>
    <TabBar />
    <div style={{height: 10}} />
    <BookExchangeControls />
  </div>;
} 