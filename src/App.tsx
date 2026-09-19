import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { MyStaking } from './pages/MyStaking';
import { Rewards } from './pages/Rewards';
import { Admin } from './pages/Admin';
import { Staking721 } from './pages/Staking721';
import { Mint1155 } from './pages/Mint1155';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/mystaking" element={<MyStaking />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/staking721" element={<Staking721 />} />
        <Route path="/mint" element={<Mint1155 />} />
      </Routes>
    </Layout>
  );
}

export default App;
