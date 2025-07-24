import React, { useState } from 'react';
import { Modal, Card, Button, Input, Upload, message, Row, Col, Checkbox } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

// Product 타입 정의
export type Product = {
  category: string;
  item: string;
  price: number;
  vatType?: string;
  // 필요시 추가 필드
};

// ProductSelectModal props 타입 정의
interface ProductSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selected: Product[]) => void;
}

const ProductSelectModal: React.FC<ProductSelectModalProps> = ({ open, onClose, onSelect }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product[]>([]);
  const [search, setSearch] = useState('');

  // 엑셀 업로드 핸들러
  const handleUpload = (file: any) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      const data = new Uint8Array(e.target.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet) as Product[];
      setProducts(json);
      message.success('제품 데이터 업로드 완료!');
    };
    reader.readAsArrayBuffer(file);
  };

  // 제품 선택 토글
  const toggleSelect = (product: Product) => {
    setSelected((prev) => {
      const exists = prev.find((p) => p.item === product.item && p.price === product.price);
      if (exists) return prev.filter((p) => !(p.item === product.item && p.price === product.price));
      return [...prev, product];
    });
  };

  // 검색 필터
  const filtered = products.filter(
    (p) =>
      (!search ||
        p.item?.toString().includes(search) ||
        p.category?.toString().includes(search) ||
        p.price?.toString().includes(search))
  );

  return (
    <Modal open={open} onCancel={onClose} onOk={() => { onSelect(selected); setSelected([]); onClose(); }} title="제품 상세 선택" width={900}>
      {/* 상단: 엑셀 업로드 + 검색창 한 줄 정렬 */}
      <Row gutter={16} align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Upload beforeUpload={handleUpload} showUploadList={false} accept=".xlsx,.xls">
            <Button icon={<UploadOutlined />}>엑셀 업로드</Button>
          </Upload>
        </Col>
        <Col flex="auto">
          <Input.Search
            placeholder="제품명/카테고리/상품명 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 350 }}
          />
        </Col>
      </Row>
      {/* 제품 카드 목록 */}
      <Row gutter={[16, 16]} style={{ minHeight: 200 }}>
        {filtered.length === 0 ? (
          <Col span={24} style={{ textAlign: 'center', color: '#aaa', padding: '40px 0' }}>
            제품이 없습니다. 엑셀을 업로드하거나 검색어를 확인하세요.
          </Col>
        ) : (
          filtered.map((product: Product) => (
            <Col span={8} key={product.item + product.price}>
              <Card
                title={product.item}
                extra={<Checkbox checked={!!selected.find(p => p.item === product.item && p.price === product.price)} onChange={() => toggleSelect(product)} />}
                bordered
                style={{ marginBottom: 8 }}
              >
                <div>카테고리: {product.category}</div>
                <div>상품/서비스: {product.item}</div>
                <div>단가: {product.price?.toLocaleString()}원</div>
                <div>부가세: {product.vatType}</div>
              </Card>
            </Col>
          ))
        )}
      </Row>
      {/* 하단 버튼 */}
      <div style={{ marginTop: 32, textAlign: 'right' }}>
        <Button onClick={onClose} style={{ marginRight: 8 }}>취소</Button>
        <Button type="primary" onClick={() => { onSelect(selected); setSelected([]); onClose(); }} disabled={selected.length === 0}>선택한 제품 추가</Button>
      </div>
    </Modal>
  );
};
export default ProductSelectModal; 