import React, { useState } from 'react';
import { Button, Input, Select, Card, Typography } from 'antd';

const { Option } = Select;
const { Title } = Typography;

interface LoginProps {
  onLogin: (user: { username: string; role: 'admin' | 'staff' }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');

  const handleLogin = () => {
    // 실제 서비스에서는 서버 인증 필요, 여기선 데모용
    if (username && password) {
      onLogin({ username, role });
    } else {
      alert('아이디와 비밀번호를 입력하세요.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f5f6fa' }}>
      <Card style={{ width: 350, padding: 24 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>로그인</Title>
        <Input
          placeholder="아이디"
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        <Input.Password
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        <Select
          value={role}
          onChange={value => setRole(value)}
          style={{ width: '100%', marginBottom: 24 }}
        >
          <Option value="admin">관리자</Option>
          <Option value="staff">직원</Option>
        </Select>
        <Button type="primary" block onClick={handleLogin}>
          로그인
        </Button>
      </Card>
    </div>
  );
};

export default Login; 