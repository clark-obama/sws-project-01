import React, { useEffect, useState } from 'react';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import ConsultationForm from './components/ConsultationForm';
import 'antd/dist/reset.css';
import './App.css';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';

// Electron preload에서 노출한 API 타입 선언
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    electronAPI?: {
      saveData: (data: any) => void;
      loadData: () => Promise<any>;
      onRequestSave: (callback: () => void) => void;
      onRequestLoad: (callback: () => void) => void;
    };
  }
}

dayjs.locale('ko');

function AppContent() {
  const { user, login, logout } = useAuth();

  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Noto Sans KR, NanumSquare, sans-serif' }}>
      {/* 성원사 로고 상단 배치 */}
      <div
        style={{
          width: '100%',
          background: '#fff',
          padding: '36px 0 24px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <img
          src={process.env.PUBLIC_URL + "/sungwonsa_logo.png"}
          alt="성원사 로고"
          style={{
            height: 80,
            marginBottom: 8,
            objectFit: 'contain',
            maxWidth: '320px',
            width: '100%',
            display: 'block',
          }}
        />
      </div>
      <div style={{ width: '100%', height: 1, background: '#e5e5e5', marginBottom: 32 }} />
      <ConsultationForm />
      <div style={{ textAlign: 'right', margin: 16 }}>
        <span style={{ marginRight: 8 }}>{user.username} ({user.role === 'admin' ? '관리자' : '직원'})</span>
        <button onClick={logout}>로그아웃</button>
      </div>
    </div>
  );
}

function App() {
  const [customerFormData, setCustomerFormData] = useState({});
  const [consultFormData, setConsultFormData] = useState({});
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    // 파일 메뉴에서 '저장' 클릭 시 현재 상태 저장
    window.electronAPI?.onRequestSave?.(() => {
      window.electronAPI?.saveData?.({
        customerFormData,
        consultFormData,
        tableData,
      });
    });
    // 파일 메뉴에서 '불러오기' 클릭 시 data.json에서 불러와 상태 복원
    window.electronAPI?.onRequestLoad?.(async () => {
      const data = await window.electronAPI?.loadData?.();
      if (data) {
        setCustomerFormData(data.customerFormData);
        setConsultFormData(data.consultFormData);
        setTableData(data.tableData);
      }
    });
  }, [customerFormData, consultFormData, tableData]);

  return (
    <AuthProvider>
      <ConfigProvider locale={koKR}>
        <AppContent />
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
