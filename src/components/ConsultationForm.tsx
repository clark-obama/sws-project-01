import React, { useState, useEffect, useMemo } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Row, 
  Col, 
  DatePicker, 
  Select, 
  InputNumber, 
  Table, 
  Tag, 
  Space, 
  Popconfirm, 
  Modal, 
  Descriptions, 
  Typography, 
  TableProps,
  Radio,
  Divider,
  Upload,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined, 
  PictureOutlined,
} from '@ant-design/icons';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import ProductSelectModal from './ProductSelectModal';
import { useAuth } from '../AuthContext';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const { Option } = Select;
const { Title } = Typography;
const { Text } = Typography;
const { RangePicker } = DatePicker;

// 카테고리별 색상 매핑
const categoryColors: Record<string, string> = {
  equipment: 'geekblue',
  material: 'green',
  interior: 'orange',
  education: 'purple',
};

// 카테고리 및 상품/서비스 예시 데이터
const categories = [
  { label: '미용기자재', value: 'equipment', items: [
    { name: '의자', products: ['프리미엄 의자', '스탠다드 의자'] },
    { name: '샴푸대', products: ['자동 샴푸대', '수동 샴푸대'] },
    { name: '디지털기계', products: ['디지털펌기', '스팀기'] },
    { name: '열기계', products: ['열처리기', '건조기'] },
    { name: '셋팅기계', products: ['셋팅펌기', '롤셋기'] },
    { name: '미스트기', products: ['미스트기'] },
    { name: '츄레이', products: ['츄레이'] },
    { name: '고데기', products: ['고데기'] },
    { name: '아이롱기', products: ['아이롱기'] },
    { name: '드라이기', products: ['드라이기'] },
  ] },
  { label: '미용재료', value: 'material', items: [
    { name: '염모제', products: ['염색약A', '염색약B'] },
    { name: '펌제', products: ['펌제A', '펌제B'] },
    { name: '클리닉제', products: ['클리닉제A', '클리닉제B'] },
    { name: '샴푸', products: ['샴푸A', '샴푸B'] },
    { name: '트리트먼트', products: ['트리트먼트A', '트리트먼트B'] },
    { name: '헤어 마스크팩', products: ['마스크팩A', '마스크팩B'] },
    { name: '비품', products: ['비품A', '비품B', '비품C'] },
  ] },
  { label: '인테리어', value: 'interior', items: [
    { name: '인테리어 상담', products: ['전체 인테리어', '부분 인테리어'] },
    { name: '가구', products: ['의자', '테이블'] },
    { name: '조명', products: ['LED 조명', '무드등'] },
    { name: '기타', products: ['기타'] },
  ] },
  { label: '교육', value: 'education', items: [
    { name: '커트교육', products: ['기본 커트', '고급 커트'] },
    { name: '펌교육', products: ['기본 펌', '고급 펌'] },
    { name: '컬러교육', products: ['기본 컬러', '고급 컬러'] },
    { name: '살롱 경영세미나', products: ['경영 세미나'] },
  ] },
];

// 1. 상태 및 폼 인스턴스 분리
const initialCustomerForm = {
  date: dayjs(),
  salon: '',
  customer: '',
  phone: '',
  address: '',
  interiorStart: null,
  interiorEnd: null,
  cleaningEnd: null,
  openHope: null,
  installHopeType: 'single' as 'single' | 'range' | 'multiple',
  installHope: null,
  installHopeRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
  installHopeMultiple: [] as dayjs.Dayjs[],
};
const initialConsultForm = {
  category: undefined,
  item: undefined,
  product: undefined,
  quantity: 1,
  price: undefined,
  vatType: '별도',
  vatAmount: undefined,
  note: '',
};

// TableRow 타입, formatPhone, formatMoney, handleGoogleSheetGuide 등 유틸리티/타입 선언을 컴포넌트 상단부(상태 선언부 위)로 이동
type TableRow = {
  // 고객관리 정보
  date: dayjs.Dayjs | null;
  salon: string;
  customer: string;
  phone: string;
  address: string;
  interiorStart: dayjs.Dayjs | null;
  interiorEnd: dayjs.Dayjs | null;
  cleaningEnd: dayjs.Dayjs | null;
  openHope: dayjs.Dayjs | null;
  installHopeType: 'single' | 'range' | 'multiple';
  installHope: dayjs.Dayjs | null;
  installHopeRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
  installHopeMultiple: dayjs.Dayjs[];
  // 상담입력 정보
  category: string | undefined;
  item: string | undefined;
  product: string | undefined;
  quantity: number;
  price: number | undefined;
  vatType: string;
  vatAmount: number;
  note: string;
  // 테이블 관리용
  key: React.Key;
  total: number;
  grandTotal: number;
};

const formatMoney = (value: number) => `₩${(value ?? 0).toLocaleString()}`;
const formatPhone = (phone: string) => phone.replace(/[^0-9]/g, '').replace(/(\\d{3})(\\d{3,4})(\\d{4})/, '$1-$2-$3');

const handleGoogleSheetGuide = () => {
  // 구글시트 가이드 로직 구현
  console.log('구글시트 가이드 로직 구현');
};

const ConsultationForm: React.FC = () => {
  const [customerForm] = Form.useForm();
  const [consultForm] = Form.useForm();
  const [customerFormData, setCustomerFormData] = useState(initialCustomerForm);
  const [consultFormData, setConsultFormData] = useState(initialConsultForm);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingRow, setEditingRow] = useState<TableRow | null>(null);
  const [editForm] = Form.useForm();
  const [filter] = useState({
    category: '',
    item: '',
    product: ''
  });
  const [sorter, setSorter] = useState<SorterResult<TableRow>>({});
  const [productModalOpen, setProductModalOpen] = useState(false);
  // 상태 추가
  const [customCategory, setCustomCategory] = useState('');
  const [customItem, setCustomItem] = useState('');
  const [customProduct, setCustomProduct] = useState('');
  const [categoryMode, setCategoryMode] = useState<'select' | 'custom'>('select');
  const [itemMode, setItemMode] = useState<'select' | 'custom'>('select');
  const [productMode, setProductMode] = useState<'select' | 'custom'>('select');
  const { user } = useAuth();
  const [visualModalOpen, setVisualModalOpen] = useState(false);
  const [visualImages, setVisualImages] = useState<any[]>([]);
  const [visualDescription, setVisualDescription] = useState('');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchDate, setSearchDate] = useState<dayjs.Dayjs | null>(null);
  const [searchVisualDesc, setSearchVisualDesc] = useState('');
  const [searchVisualDate, setSearchVisualDate] = useState<dayjs.Dayjs | null>(null);
  // 상세 모달 상태 추가
  const [historyDetailModalOpen, setHistoryDetailModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<any>(null);
  // visualUploading 상태 추가
  const [visualUploading, setVisualUploading] = useState(false);
  // 상세페이지 이미지 업로드 상태 추가
  const [detailImages, setDetailImages] = useState<any[]>([]);
  const [visualDetailModalOpen, setVisualDetailModalOpen] = useState(false);
  const [visualDetailList, setVisualDetailList] = useState<any[]>([]);
  const [visualDetailLoading, setVisualDetailLoading] = useState(false);
  const [visualDetailSearch, setVisualDetailSearch] = useState('');
  const [visualAdminModalOpen, setVisualAdminModalOpen] = useState(false);

  const handleTableChange: TableProps<TableRow>['onChange'] = (pagination, filters, newSorter, extra) => {
    setSorter(newSorter as SorterResult<TableRow>);
  };

  // 카테고리/상품/제품 옵션
  const selectedCategory = categories.find(cat => cat.value === consultFormData.category);
  const itemOptions = selectedCategory ? selectedCategory.items : [];
  const selectedItem = itemOptions.find(i => i.name === consultFormData.item);
  const productOptions = selectedItem ? selectedItem.products : [];

  // 단가합계(수량*단가)
  const total = consultFormData.price && consultFormData.quantity ? consultFormData.price * consultFormData.quantity : 0;
  // 세액(10%)
  const calcVat = () => total ? Math.round(total * 0.1) : 0;
  // 합계금액(단가합계+세액)
  const grandTotal = total + (consultFormData.vatAmount || 0);

  const vatOptions = [
    { label: '0원', value: 0 },
    { label: `10% (${calcVat().toLocaleString()}원)`, value: calcVat() },
  ];

  // 2. onValuesChange 핸들러 분리
  const handleCustomerChange = (changed: any, all: any) => {
    let phone = all.phone;
    if (changed.phone !== undefined) {
      phone = formatPhone(changed.phone);
    }
    setCustomerFormData({ ...all, phone });
  };
  const handleConsultChange = (changed: any, all: any) => {
    setConsultFormData(all);
  };

  // 전화번호 입력란 onChange 핸들러 추가
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const formatted = formatPhone(value);
    customerForm.setFieldsValue({ phone: formatted });
    setCustomerFormData(prev => ({ ...prev, phone: formatted }));
  };

  // 기자재 설치 희망일자 포맷팅 함수
  const formatInstallHopeDates = () => {
    if (customerFormData.installHopeType === 'single' && customerFormData.installHope) {
      return dayjs(customerFormData.installHope).format('YYYY-MM-DD');
    } else if (customerFormData.installHopeType === 'range' && customerFormData.installHopeRange) {
      const [start, end] = customerFormData.installHopeRange;
      return `${dayjs(start).format('YYYY-MM-DD')} ~ ${dayjs(end).format('YYYY-MM-DD')}`;
    } else if (customerFormData.installHopeType === 'multiple' && customerFormData.installHopeMultiple.length > 0) {
      return customerFormData.installHopeMultiple.map(date => dayjs(date).format('YYYY-MM-DD')).join(', ');
    }
    return '-';
  };

  // 여러 날짜 추가 함수
  const addMultipleDate = (date: dayjs.Dayjs | null) => {
    if (date && !(customerFormData.installHopeMultiple || []).some(d => dayjs(d).isSame(date, 'day'))) {
      setCustomerFormData(prev => ({
        ...prev,
        installHopeMultiple: [...(prev.installHopeMultiple || []), date],
      }));
    }
  };

  // 여러 날짜 제거 함수
  const removeMultipleDate = (dateToRemove: dayjs.Dayjs) => {
    setCustomerFormData(prev => ({
      ...prev,
      installHopeMultiple: (prev.installHopeMultiple || []).filter(date => !dayjs(date).isSame(dateToRemove, 'day')),
    }));
  };

  // 폼 유효성 체크 (추가 버튼 활성화)
  useEffect(() => {
    customerForm
      .validateFields()
      .then(() => setIsFormValid(true))
      .catch(() => setIsFormValid(false));
  }, [customerFormData, customerForm]);

  // 3. handleAdd 수정 (상담입력만 초기화)
  const handleAdd = () => {
    const newRow: TableRow = {
      ...customerFormData,
      ...consultForm.getFieldsValue(),
      key: Date.now(),
      total: consultFormData.price && consultFormData.quantity ? consultFormData.price * consultFormData.quantity : 0,
      vatAmount: consultFormData.vatAmount,
      grandTotal: (consultFormData.price && consultFormData.quantity ? consultFormData.price * consultFormData.quantity : 0) + (consultFormData.vatAmount || 0),
    };
    setTableData([...tableData, newRow]);
    consultForm.resetFields();
    consultForm.setFieldsValue(initialConsultForm);
    setConsultFormData(initialConsultForm);
  };

  // 삭제
  const handleDelete = (key: React.Key) => {
    setTableData(tableData.filter(row => row.key !== key));
  };

  // 위치 이동 (드래그 앤 드롭용)
  const moveRow = (dragIndex: number, hoverIndex: number) => {
    // 인덱스 유효성 검사
    if (dragIndex < 0 || hoverIndex < 0 || 
        dragIndex >= filteredTableData.length || 
        hoverIndex >= filteredTableData.length ||
        dragIndex === hoverIndex) {
      return;
    }

    const dragRow = filteredTableData[dragIndex];
    const hoverRow = filteredTableData[hoverIndex];
    
    // 행 데이터 유효성 검사
    if (!dragRow || !hoverRow || !dragRow.key || !hoverRow.key) {
      return;
    }

    const newData = [...tableData];
    
    // tableData에서 해당 행의 실제 인덱스 찾기
    const dragRowIndex = tableData.findIndex(row => row.key === dragRow.key);
    const hoverRowIndex = tableData.findIndex(row => row.key === hoverRow.key);
    
    if (dragRowIndex !== -1 && hoverRowIndex !== -1) {
      // 행 위치 교환
      [newData[dragRowIndex], newData[hoverRowIndex]] = [newData[hoverRowIndex], newData[dragRowIndex]];
      setTableData(newData);
    }
  };

  // 수정 모달 열기
  const handleEdit = (row: TableRow) => {
    setEditingRow(row);
    editForm.setFieldsValue(row);
    setIsEditModalVisible(true);
  };

  // 수정 저장
  const handleEditSave = () => {
    editForm.validateFields().then((values) => {
      const updatedRow = { ...editingRow, ...values };
      const newTableData = tableData.map(row => 
        row.key === editingRow?.key ? updatedRow : row
      );
      setTableData(newTableData);
      setIsEditModalVisible(false);
      setEditingRow(null);
      editForm.resetFields();
    });
  };

  // 수정 모달 취소
  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    setEditingRow(null);
    editForm.resetFields();
  };

  // DnD용 row 컴포넌트
  const type = 'DraggableBodyRow';
  const DraggableBodyRow = ({ index, moveRow, className, style, ...restProps }: any) => {
    const ref = React.useRef<HTMLTableRowElement>(null);
    
    // React Hook은 항상 동일한 순서로 호출되어야 함
    const [{ isOver, dropClassName }, drop] = useDrop({
      accept: type,
      collect: monitor => {
        const { index: dragIndex } = monitor.getItem() || {};
        if (dragIndex === index) return {};
        return {
          isOver: monitor.isOver(),
          dropClassName: dragIndex < index ? ' drop-over-downward' : ' drop-over-upward',
        };
      },
      drop: (item: any) => {
        if (item && typeof item.index === 'number' && typeof index === 'number') {
          moveRow(item.index, index);
        }
      },
    });
    
    const [{ isDragging }, drag] = useDrag({
      type,
      item: { index },
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    });
    
    // ref를 drop과 drag에 연결
    drag(drop(ref));
    
    // index 유효성 검사 - Hook 호출 후에 조건부 렌더링
    if (typeof index !== 'number' || index < 0) {
      return <tr className={className} style={style} {...restProps} />;
    }
    
    return (
      <tr 
        ref={ref} 
        className={`${className || ''}${isOver ? dropClassName : ''}${isDragging ? ' dragging' : ''} draggable-row`} 
        style={{ 
          cursor: 'pointer', 
          ...style,
          opacity: isDragging ? 0.5 : 1,
          transition: 'all 0.2s ease',
          position: 'relative'
        }} 
        {...restProps} 
      />
    );
  };

  // 필터링된 데이터
  const filteredTableData = tableData.filter(row => {
    if (filter.category && row.category !== filter.category) return false;
    if (filter.item && row.item !== filter.item) return false;
    if (filter.product && row.product !== filter.product) return false;
    return true;
  }) || [];

  // 테이블 컬럼 정의 (상단 정보 제외)
  const columns: ColumnsType<TableRow> = [
    {
      title: '⋮⋮',
      key: 'dragHandle',
      width: 60,
      align: 'center',
      render: (_, record, index) => (
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%',
            cursor: 'pointer',
            color: '#666',
            fontWeight: 'bold',
            userSelect: 'none',
            padding: '8px 0',
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#1890ff';
            e.currentTarget.style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#666';
            e.currentTarget.style.cursor = 'pointer';
          }}
        >
          ⋮⋮
        </div>
      ),
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      align: 'center',
      // sorter 제거
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Select
            mode="multiple"
            allowClear
            style={{ width: 188, marginBottom: 8, display: 'block' }}
            placeholder="카테고리 선택"
            value={selectedKeys}
            onChange={setSelectedKeys}
          >
            {categories.map(cat => <Option key={cat.value} value={cat.value}>{cat.label}</Option>)}
          </Select>
          <Space>
            <Button onClick={() => confirm()} type="primary" size="small" style={{ width: 90 }}>검색</Button>
            <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>초기화</Button>
          </Space>
          <Divider style={{ margin: '8px 0' }} />
          <Radio.Group 
            onChange={(e) => handleTableChange({}, {}, { columnKey: 'category', order: e.target.value }, { action: 'sort', currentDataSource: [] })}
            value={sorter.columnKey === 'category' ? sorter.order : null}
          >
            <Radio value="ascend">오름차순</Radio>
            <Radio value="descend">내림차순</Radio>
            <Radio value={null}>정렬 없음</Radio>
          </Radio.Group>
        </div>
      ),
      onFilter: (value, record) => record.category === value,
      render: (v) => {
        const cat = categories.find(c => c.value === v);
        return (
          <Tag
            color={categoryColors[v] || 'default'}
            style={{
              fontWeight: 500,
              padding: '0 12px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              height: '32px',
              lineHeight: '32px',
              margin: '0 auto',
              verticalAlign: 'middle',
            }}
          >
            {cat ? cat.label : v}
          </Tag>
        );
      },
    },
    { 
      title: '상품/서비스', 
      dataIndex: 'item', 
      key: 'item',
      align: 'center',
      // sorter 제거
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="검색"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button onClick={() => confirm()} type="primary" size="small" style={{ width: 90 }}>검색</Button>
            <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>초기화</Button>
          </Space>
          <Divider style={{ margin: '8px 0' }} />
          <Radio.Group 
            onChange={(e) => handleTableChange({}, {}, { columnKey: 'item', order: e.target.value }, { action: 'sort', currentDataSource: [] })}
            value={sorter.columnKey === 'item' ? sorter.order : null}
          >
            <Radio value="ascend">오름차순</Radio>
            <Radio value="descend">내림차순</Radio>
            <Radio value={null}>정렬 없음</Radio>
          </Radio.Group>
        </div>
      ),
      filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />, 
      onFilter: (value, record) => record.item ? (record.item as string).toLowerCase().includes((value as string).toLowerCase()) : false,
    },
    { 
      title: '제품명', 
      dataIndex: 'product', 
      key: 'product', 
      align: 'center',
      // sorter 제거
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="검색"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button onClick={() => confirm()} type="primary" size="small" style={{ width: 90 }}>검색</Button>
            <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>초기화</Button>
          </Space>
          <Divider style={{ margin: '8px 0' }} />
          <Radio.Group 
            onChange={(e) => handleTableChange({}, {}, { columnKey: 'product', order: e.target.value }, { action: 'sort', currentDataSource: [] })}
            value={sorter.columnKey === 'product' ? sorter.order : null}
          >
            <Radio value="ascend">오름차순</Radio>
            <Radio value="descend">내림차순</Radio>
            <Radio value={null}>정렬 없음</Radio>
          </Radio.Group>
        </div>
      ),
      filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />, 
      onFilter: (value, record) => record.product ? (record.product as string).toLowerCase().includes((value as string).toLowerCase()) : false,
    },
    { 
      title: '수량', 
      dataIndex: 'quantity', 
      key: 'quantity', 
      align: 'center',
      // sorter 제거
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <InputNumber
            style={{ width: 188, marginBottom: 8, display: 'block' }}
            placeholder="수량 입력"
            value={selectedKeys[0] ? Number(selectedKeys[0]) : undefined}
            onChange={value => setSelectedKeys(value ? [value] : [])}
            onPressEnter={() => confirm()}
          />
          <Space>
            <Button onClick={() => confirm()} type="primary" size="small" style={{ width: 90 }}>검색</Button>
            <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>초기화</Button>
          </Space>
          <Divider style={{ margin: '8px 0' }} />
          <Radio.Group 
            onChange={(e) => handleTableChange({}, {}, { columnKey: 'quantity', order: e.target.value }, { action: 'sort', currentDataSource: [] })}
            value={sorter.columnKey === 'quantity' ? sorter.order : null}
          >
            <Radio value="ascend">오름차순</Radio>
            <Radio value="descend">내림차순</Radio>
            <Radio value={null}>정렬 없음</Radio>
          </Radio.Group>
        </div>
      ),
      filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />, 
      onFilter: (value, record) => record.quantity === value,
    },
    { 
      title: '단가', 
      dataIndex: 'price', 
      key: 'price', 
      align: 'center',
      // sorter 제거
      render: (v: number) => v < 0 ? <span style={{ color: 'red' }}>{formatMoney(v)}</span> : formatMoney(v),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <InputNumber
            style={{ width: 188, marginBottom: 8, display: 'block' }}
            placeholder="단가 입력"
            value={selectedKeys[0] ? Number(selectedKeys[0]) : undefined}
            onChange={value => setSelectedKeys(value ? [value] : [])}
            onPressEnter={() => confirm()}
          />
          <Space>
            <Button onClick={() => confirm()} type="primary" size="small" style={{ width: 90 }}>검색</Button>
            <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>초기화</Button>
          </Space>
          <Divider style={{ margin: '8px 0' }} />
          <Radio.Group 
            onChange={(e) => handleTableChange({}, {}, { columnKey: 'price', order: e.target.value }, { action: 'sort', currentDataSource: [] })}
            value={sorter.columnKey === 'price' ? sorter.order : null}
          >
            <Radio value="ascend">오름차순</Radio>
            <Radio value="descend">내림차순</Radio>
            <Radio value={null}>정렬 없음</Radio>
          </Radio.Group>
        </div>
      ),
      filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />, 
      onFilter: (value, record) => record.price === value,
    },
    { 
      title: '단가합계', 
      dataIndex: 'total', 
      key: 'total', 
      align: 'center',
      // sorter 제거
      render: (v: number) => v < 0 ? <span style={{ color: 'red' }}>{formatMoney(v)}</span> : formatMoney(v),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <InputNumber
            style={{ width: 188, marginBottom: 8, display: 'block' }}
            placeholder="단가합계 입력"
            value={selectedKeys[0] ? Number(selectedKeys[0]) : undefined}
            onChange={value => setSelectedKeys(value ? [value] : [])}
            onPressEnter={() => confirm()}
          />
          <Space>
            <Button onClick={() => confirm()} type="primary" size="small" style={{ width: 90 }}>검색</Button>
            <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>초기화</Button>
          </Space>
          <Divider style={{ margin: '8px 0' }} />
          <Radio.Group 
            onChange={(e) => handleTableChange({}, {}, { columnKey: 'total', order: e.target.value }, { action: 'sort', currentDataSource: [] })}
            value={sorter.columnKey === 'total' ? sorter.order : null}
          >
            <Radio value="ascend">오름차순</Radio>
            <Radio value="descend">내림차순</Radio>
            <Radio value={null}>정렬 없음</Radio>
          </Radio.Group>
        </div>
      ),
      filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />, 
      onFilter: (value, record) => record.total === value,
    },
    { 
      title: '합계금액', 
      dataIndex: 'grandTotal', 
      key: 'grandTotal', 
      align: 'center',
      // sorter 제거
      render: (v: number) => v < 0 ? <span style={{ color: 'red' }}>{formatMoney(v)}</span> : formatMoney(v),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <InputNumber
            style={{ width: 188, marginBottom: 8, display: 'block' }}
            placeholder="합계금액 입력"
            value={selectedKeys[0] ? Number(selectedKeys[0]) : undefined}
            onChange={value => setSelectedKeys(value ? [value] : [])}
            onPressEnter={() => confirm()}
          />
          <Space>
            <Button onClick={() => confirm()} type="primary" size="small" style={{ width: 90 }}>검색</Button>
            <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>초기화</Button>
          </Space>
          <Divider style={{ margin: '8px 0' }} />
          <Radio.Group 
            onChange={(e) => handleTableChange({}, {}, { columnKey: 'grandTotal', order: e.target.value }, { action: 'sort', currentDataSource: [] })}
            value={sorter.columnKey === 'grandTotal' ? sorter.order : null}
          >
            <Radio value="ascend">오름차순</Radio>
            <Radio value="descend">내림차순</Radio>
            <Radio value={null}>정렬 없음</Radio>
          </Radio.Group>
        </div>
      ),
      filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />, 
      onFilter: (value, record) => record.grandTotal === value,
    },
    {
      title: '부가세여부',
      dataIndex: 'vatType',
      key: 'vatType',
      align: 'center',
      // sorter 제거
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Radio.Group
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            style={{ marginBottom: 8, display: 'flex', flexDirection: 'column' }}
          >
            <Radio value="포함">포함</Radio>
            <Radio value="별도">별도</Radio>
          </Radio.Group>
          <Space>
            <Button onClick={() => confirm()} type="primary" size="small" style={{ width: 90 }}>검색</Button>
            <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>초기화</Button>
          </Space>
          <Divider style={{ margin: '8px 0' }} />
          <Radio.Group 
            onChange={(e) => handleTableChange({}, {}, { columnKey: 'vatType', order: e.target.value }, { action: 'sort', currentDataSource: [] })}
            value={sorter.columnKey === 'vatType' ? sorter.order : null}
          >
            <Radio value="ascend">오름차순</Radio>
            <Radio value="descend">내림차순</Radio>
            <Radio value={null}>정렬 없음</Radio>
          </Radio.Group>
        </div>
      ),
      onFilter: (value, record) => record.vatType === value,
    },
    {
      title: '세액',
      dataIndex: 'vatAmount',
      key: 'vatAmount',
      align: 'center',
      // sorter 제거
      render: (v: number) => formatMoney(v),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <InputNumber
            style={{ width: 188, marginBottom: 8, display: 'block' }}
            placeholder="세액 입력"
            value={selectedKeys[0] ? Number(selectedKeys[0]) : undefined}
            onChange={value => setSelectedKeys(value ? [value] : [])}
            onPressEnter={() => confirm()}
          />
          <Space>
            <Button onClick={() => confirm()} type="primary" size="small" style={{ width: 90 }}>검색</Button>
            <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 90 }}>초기화</Button>
          </Space>
          <Divider style={{ margin: '8px 0' }} />
          <Radio.Group 
            onChange={(e) => handleTableChange({}, {}, { columnKey: 'vatAmount', order: e.target.value }, { action: 'sort', currentDataSource: [] })}
            value={sorter.columnKey === 'vatAmount' ? sorter.order : null}
          >
            <Radio value="ascend">오름차순</Radio>
            <Radio value="descend">내림차순</Radio>
            <Radio value={null}>정렬 없음</Radio>
          </Radio.Group>
        </div>
      ),
      filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />, 
      onFilter: (value, record) => record.vatAmount === value,
    },
    { 
      title: '특이사항', 
      dataIndex: 'note', 
      key: 'note', 
      align: 'center',
      // sorter 제거
    },
    {
      title: '관리',
      key: 'action',
      align: 'center',
      render: (_, row, idx) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" type="primary" onClick={() => handleEdit(row)} />
          <Popconfirm title="정말 삭제하시겠습니까?" onConfirm={() => handleDelete(row.key)} okText="네" cancelText="아니오">
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 상세선택에서 제품 선택 시 테이블에 추가하는 함수
  const handleProductSelect = (selectedProducts: any[]) => {
    const newRows = selectedProducts.map((product: any) => ({
      ...customerFormData,
      ...product,
      key: Date.now() + Math.random(),
      quantity: 1,
      total: product.price,
      vatAmount: product.vatType === '포함' ? Math.round(product.price * 0.1) : 0,
      grandTotal: product.price + (product.vatType === '포함' ? Math.round(product.price * 0.1) : 0),
    }));
    setTableData(prev => [...prev, ...newRows]);
  };

  // Electron 저장/불러오기 연동
  useEffect(() => {
    window.electronAPI?.onRequestSave?.(() => {
      window.electronAPI?.saveData?.({
        customerFormData,
        consultFormData,
        tableData,
      });
    });
    window.electronAPI?.onRequestLoad?.(async () => {
      const data = await window.electronAPI?.loadData?.();
      if (data) {
        setCustomerFormData(data.customerFormData);
        setConsultFormData(data.consultFormData);
        setTableData(data.tableData);
      }
    });
  }, [customerFormData, consultFormData, tableData]);

  // 관리자 알림용 함수(예시, 실제 구현은 백엔드 필요)
  const notifyAdmin = async (message: string) => {
    // 실제로는 REST API, Firebase Functions 등으로 구현 필요
    // 예시: await fetch('/notify-admin', { method: 'POST', body: JSON.stringify({ message }) });
    console.log('관리자에게 알림:', message);
  };

  // 상담 이력 저장 (Firebase 연동)
  const handleSaveHistory = async () => {
    try {
      await addDoc(collection(db, 'consultingHistory'), {
        customerFormData,
        consultFormData,
        tableData,
        createdAt: new Date(),
        username: user?.username || '',
      });
      await notifyAdmin(`새 상담 이력이 등록되었습니다. 담당자: ${user?.username || ''}`);
      alert('상담 이력이 Firebase에 저장되었습니다!');
    } catch (e) {
      alert('저장 중 오류 발생: ' + e);
    }
  };

  // 관리자용 상담 이력 불러오기 (Firebase 연동 + 화면 표시)
  const handleLoadHistory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'consultingHistory'));
      let list = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), docId: doc.id }));
      if (user?.role === 'staff') {
        list = list.filter((item: any) => item.username === user.username);
      }
      setHistoryList(list);
      setHistoryModalOpen(true);
    } catch (e) {
      alert('불러오기 중 오류 발생: ' + e);
    }
  };

  // 관리자용 비쥬얼 상세 이력 불러오기
  const handleLoadVisualList = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'visualDetails'));
      const list = querySnapshot.docs.map(doc => doc.data());
      Modal.info({
        title: '비쥬얼 상세 이력',
        width: 800,
        content: (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <Input placeholder="설명 검색" value={searchVisualDesc} onChange={e => setSearchVisualDesc(e.target.value)} style={{ width: 180 }} />
              <DatePicker placeholder="등록일" value={searchVisualDate} onChange={setSearchVisualDate} style={{ width: 130 }} />
            </div>
            {list
              .filter((item: any) => {
                const descMatch = searchVisualDesc ? (item.description || '').includes(searchVisualDesc) : true;
                let dateMatch = true;
                if (searchVisualDate) {
                  const createdAt = item.createdAt;
                  let itemDateStr = '';
                  if (createdAt && createdAt.toDate) {
                    itemDateStr = dayjs(createdAt.toDate()).format('YYYY-MM-DD');
                  } else if (typeof createdAt === 'string') {
                    itemDateStr = createdAt.slice(0, 10);
                  }
                  dateMatch = itemDateStr === searchVisualDate.format('YYYY-MM-DD');
                }
                return descMatch && dateMatch;
              })
              .map((item: any, idx: number) => (
                <div key={idx} style={{ marginBottom: 24 }}>
                  <div>설명: {item.description}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {item.images && item.images.map((url: string, i: number) => (
                      <img key={i} src={url} alt="상세 이미지" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} />
                    ))}
                  </div>
                  <div style={{ color: '#888', fontSize: 12 }}>등록일: {item.createdAt?.toDate?.().toLocaleString?.() || String(item.createdAt)}</div>
                  <hr />
                </div>
              ))}
          </div>
        ),
        okText: '닫기',
      });
    } catch (e) {
      alert('비쥬얼 상세 이력 불러오기 오류: ' + e);
    }
  };

  // 비쥬얼 상세 저장 (Firebase Storage/Firestore 연동)
  const handleSaveVisualDetail = async () => {
    setVisualUploading(true);
    try {
      // 대표 이미지 업로드
      const urls = [];
      for (const fileObj of visualImages) {
        if (fileObj.originFileObj) {
          const storageRef = ref(storage, `visualDetails/${Date.now()}_${fileObj.name}`);
          await uploadBytes(storageRef, fileObj.originFileObj);
          const url = await getDownloadURL(storageRef);
          urls.push(url);
        }
      }
      // 상세 이미지 업로드
      const detailUrls = [];
      for (const fileObj of detailImages) {
        if (fileObj.originFileObj) {
          const storageRef = ref(storage, `visualDetails/detail_${Date.now()}_${fileObj.name}`);
          await uploadBytes(storageRef, fileObj.originFileObj);
          const url = await getDownloadURL(storageRef);
          detailUrls.push(url);
        }
      }
      // Firestore에 이미지 URL과 상세 설명 저장
      await addDoc(collection(db, 'visualDetails'), {
        images: urls,
        description: visualDescription,
        detailImages: detailUrls,
        createdAt: new Date(),
      });
      alert('비쥬얼 상세 정보가 Firebase에 저장되었습니다!');
      setVisualModalOpen(false);
      setVisualImages([]);
      setDetailImages([]);
      setVisualDescription('');
      setVisualUploading(false);
    } catch (e) {
      alert('비쥬얼 상세 저장 중 오류 발생: ' + e);
      setVisualUploading(false);
    }
  };

  // [handleVisualUpload 함수 정의]
  const handleVisualUpload = ({ fileList }: any) => {
    setVisualImages(fileList);
  };

  // 상담 이력 필터링
  const filteredHistoryList = useMemo(() => historyList.filter((item: any) => {
    const customerMatch = searchCustomer ? (item.customerFormData?.customer || '').includes(searchCustomer) : true;
    const categoryMatch = searchCategory ? (item.consultFormData?.category || '') === searchCategory : true;
    let dateMatch = true;
    if (searchDate) {
      const itemDate = item.customerFormData?.date;
      if (itemDate) {
        const itemDateStr = typeof itemDate === 'string' ? itemDate.slice(0, 10) : dayjs(itemDate).format('YYYY-MM-DD');
        dateMatch = itemDateStr === searchDate.format('YYYY-MM-DD');
      } else {
        dateMatch = false;
      }
    }
    return customerMatch && categoryMatch && dateMatch;
  }), [historyList, searchCustomer, searchCategory, searchDate]);

  // handleShowHistoryDetail, handleDeleteHistory 함수 추가
  const handleShowHistoryDetail = (record: any) => {
    setSelectedHistory(record);
    setHistoryDetailModalOpen(true);
  };

  const handleDeleteHistory = async (index: number) => {
    try {
      const item = filteredHistoryList[index];
      if (!item || !item.docId) {
        alert('삭제할 이력의 docId를 찾을 수 없습니다.');
        return;
      }
      await deleteDoc(doc(db, 'consultingHistory', item.docId));
      // 삭제 후 리스트 갱신
      const querySnapshot = await getDocs(collection(db, 'consultingHistory'));
      let list = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), docId: doc.id }));
      if (user?.role === 'staff') {
        list = list.filter((item: any) => item.username === user.username);
      }
      setHistoryList(list);
      alert('이력이 삭제되었습니다.');
    } catch (e) {
      alert('삭제 중 오류 발생: ' + e);
    }
  };

  const handleExcelDownload = () => {
    const headers = [
      '고객명', '상담일', '살롱명', '전화번호', '주소',
      '카테고리', '상품/서비스', '제품명', '수량', '단가', '부가세여부', '세액', '특이사항', '등록일'
    ];
    const data = filteredHistoryList.map(item => [
      item.customerFormData?.customer || '',
      String(item.customerFormData?.date || ''),
      item.customerFormData?.salon || '',
      item.customerFormData?.phone || '',
      item.customerFormData?.address || '',
      item.consultFormData?.category || '',
      item.consultFormData?.item || '',
      item.consultFormData?.product || '',
      item.consultFormData?.quantity || '',
      item.consultFormData?.price || '',
      item.consultFormData?.vatType || '',
      item.consultFormData?.vatAmount || '',
      item.consultFormData?.note || '',
      item.createdAt?.toDate?.().toLocaleString?.() || String(item.createdAt)
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '상담이력');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), '상담이력.xlsx');
  };

  const handleCsvDownload = () => {
    const headers = [
      '고객명', '상담일', '살롱명', '전화번호', '주소',
      '카테고리', '상품/서비스', '제품명', '수량', '단가', '부가세여부', '세액', '특이사항', '등록일'
    ];
    const data = filteredHistoryList.map(item => [
      item.customerFormData?.customer || '',
      String(item.customerFormData?.date || ''),
      item.customerFormData?.salon || '',
      item.customerFormData?.phone || '',
      item.customerFormData?.address || '',
      item.consultFormData?.category || '',
      item.consultFormData?.item || '',
      item.consultFormData?.product || '',
      item.consultFormData?.quantity || '',
      item.consultFormData?.price || '',
      item.consultFormData?.vatType || '',
      item.consultFormData?.vatAmount || '',
      item.consultFormData?.note || '',
      item.createdAt?.toDate?.().toLocaleString?.() || String(item.createdAt)
    ]);
    const csvContent = [headers, ...data].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, '상담이력.csv');
  };

  const handlePdfDownload = () => {
    const headers = [
      '고객명', '상담일', '살롱명', '전화번호', '주소',
      '카테고리', '상품/서비스', '제품명', '수량', '단가', '부가세여부', '세액', '특이사항', '등록일'
    ];
    const data = filteredHistoryList.map(item => [
      item.customerFormData?.customer || '',
      String(item.customerFormData?.date || ''),
      item.customerFormData?.salon || '',
      item.customerFormData?.phone || '',
      item.customerFormData?.address || '',
      item.consultFormData?.category || '',
      item.consultFormData?.item || '',
      item.consultFormData?.product || '',
      item.consultFormData?.quantity || '',
      item.consultFormData?.price || '',
      item.consultFormData?.vatType || '',
      item.consultFormData?.vatAmount || '',
      item.consultFormData?.note || '',
      item.createdAt?.toDate?.().toLocaleString?.() || String(item.createdAt)
    ]);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    pdf.setFontSize(10);
    let y = 40;
    pdf.text(headers, 40, y);
    y += 20;
    data.forEach(row => {
      pdf.text(row.map(cell => String(cell)), 40, y);
      y += 16;
      if (y > 550) {
        pdf.addPage();
        y = 40;
      }
    });
    pdf.save('상담이력.pdf');
  };

  // 비쥬얼 상세 불러오기 모달 열릴 때 Firestore에서 데이터 불러오기
  useEffect(() => {
    if (visualDetailModalOpen) {
      setVisualDetailLoading(true);
      getDocs(collection(db, 'visualDetails')).then(querySnapshot => {
        const list = querySnapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
        setVisualDetailList(list);
        setVisualDetailLoading(false);
      });
    }
  }, [visualDetailModalOpen]);

  // Upload fileList 형태로 변환하는 유틸 함수
  function urlToFileList(urls: string[], namePrefix: string) {
    return (urls || []).map((url, idx) => ({
      uid: `${namePrefix}_${idx}`,
      name: `${namePrefix}_${idx}.jpg`,
      status: 'done',
      url,
    }));
  }

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: 24, minWidth: 1200, width: '100%' }}>
      {/* 고객관리 */}
      <div style={{ marginBottom: 48 }}>
        <Title level={3} style={{ marginBottom: 24, textAlign: 'center' }}>고객관리</Title>
        <Card style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <Form
            form={customerForm}
            layout="vertical"
            onValuesChange={handleCustomerChange}
            initialValues={customerFormData}
          >
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Form.Item name="date" label="상담일시">
                  <DatePicker 
                    showTime 
                    format="YYYY-MM-DD HH:mm" 
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="salon" label="살롱명">
                  <Input placeholder="살롱명 입력" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="customer" label="고객명">
                  <Input placeholder="고객명 입력" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="phone" label="전화번호">
                  <Input
                    placeholder="전화번호 입력"
                    onChange={handlePhoneChange}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Form.Item name="address" label="주소">
                  <Input placeholder="주소 입력" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="interiorStart" label="인테리어 시작일">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="interiorEnd" label="인테리어 마감일">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Form.Item name="cleaningEnd" label="입주청소 마감일자">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="openHope" label="오픈희망 날짜">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="기자재 설치 희망일자">
                  {/* 단일일자 */}
                  {customerFormData.installHopeType === 'single' && (
                    <DatePicker
                      value={customerFormData.installHope}
                      onChange={(date) => setCustomerFormData(prev => ({ ...prev, installHope: date }))}
                      style={{ width: '100%', marginBottom: 8 }}
                      placeholder="날짜 선택"
                    />
                  )}
                  {/* 기간 */}
                  {customerFormData.installHopeType === 'range' && (
                    <RangePicker
                      value={customerFormData.installHopeRange}
                      onChange={(dates) => setCustomerFormData(prev => ({ ...prev, installHopeRange: dates as [dayjs.Dayjs, dayjs.Dayjs] }))}
                      style={{ width: '100%', marginBottom: 8 }}
                      placeholder={["시작일", "종료일"]}
                    />
                  )}
                  {/* 다중일자 */}
                  {customerFormData.installHopeType === 'multiple' && (
                    <div style={{ marginBottom: 8 }}>
                      <DatePicker
                        onChange={addMultipleDate}
                        style={{ width: '100%', marginBottom: 8 }}
                        placeholder="날짜 추가"
                      />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(customerFormData.installHopeMultiple || []).map((date, index) => (
                          <Tag
                            key={index}
                            closable
                            onClose={() => removeMultipleDate(date)}
                            style={{ margin: 2 }}
                          >
                            {dayjs(date).format('YYYY-MM-DD')}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* 타입 선택 라디오 */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <Radio.Group
                      value={customerFormData.installHopeType}
                      onChange={e => {
                        const type = e.target.value;
                        if (type === 'multiple') {
                          setCustomerFormData(prev => ({
                            ...prev,
                            installHopeType: type,
                            installHope: null,
                            installHopeRange: null,
                            installHopeMultiple: [],
                          }));
                        } else if (type === 'single') {
                          setCustomerFormData(prev => ({
                            ...prev,
                            installHopeType: type,
                            installHopeRange: null,
                            installHopeMultiple: [],
                          }));
                        } else if (type === 'range') {
                          setCustomerFormData(prev => ({
                            ...prev,
                            installHopeType: type,
                            installHope: null,
                            installHopeMultiple: [],
                          }));
                        }
                      }}
                      style={{ display: 'flex', gap: 8 }}
                    >
                      <Radio value="single">단일일자</Radio>
                      <Radio value="range">기간</Radio>
                      <Radio value="multiple">다중일자</Radio>
                    </Radio.Group>
                  </div>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      </div>

      {/* 상담입력 */}
      <div style={{ marginBottom: 48 }}>
        <Title level={3} style={{ marginBottom: 24, textAlign: 'center' }}>상담입력</Title>
        <Card style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <style>
            {`
              @media (max-width: 768px) {
                .ant-row {
                  flex-direction: column;
                  gap: 0;
                }
                .ant-col {
                  width: 100% !important;
                  max-width: 100% !important;
                  padding: 0 !important;
                }
                .ant-form-item {
                  margin-bottom: 16px;
                }
                .ant-table {
                  font-size: 13px;
                }
                .ant-btn {
                  width: 100% !important;
                  margin-bottom: 8px;
                }
              }
            `}
          </style>
          <Form
            form={consultForm}
            layout="vertical"
            onValuesChange={handleConsultChange}
            initialValues={consultFormData}
          >
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Form.Item name="category" label="카테고리">
                  {categoryMode === 'select' ? (
                    <Select
                      placeholder="카테고리 선택"
                      style={{ width: '100%' }}
                      allowClear
                      onChange={value => {
                        if (value === '__custom__') {
                          setCustomCategory(''); // 입력란 비우기
                          consultForm.setFieldsValue({ category: undefined }); // 값 비우기
                          setCategoryMode('custom');
                        }
                      }}
                    >
                      {categories.map(cat => (
                        <Option key={cat.value} value={cat.value}>{cat.label}</Option>
                      ))}
                      <Option value="__custom__">직접입력</Option>
                    </Select>
                  ) : (
                    <Input
                      placeholder="직접 입력"
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      onBlur={() => {
                        consultForm.setFieldsValue({ category: customCategory });
                        setCategoryMode('select');
                      }}
                      autoFocus
                    />
                  )}
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="item" label="상품/서비스">
                  {itemMode === 'select' ? (
                    <Select
                      placeholder="상품/서비스 선택"
                      style={{ width: '100%' }}
                      allowClear
                      onChange={value => {
                        if (value === '__custom__') {
                          setCustomItem('');
                          consultForm.setFieldsValue({ item: undefined });
                          setItemMode('custom');
                        }
                      }}
                    >
                      {itemOptions.map(item => (
                        <Option key={item.name} value={item.name}>{item.name}</Option>
                      ))}
                      <Option value="__custom__">직접입력</Option>
                    </Select>
                  ) : (
                    <Input
                      placeholder="직접 입력"
                      value={customItem}
                      onChange={e => setCustomItem(e.target.value)}
                      onBlur={() => {
                        consultForm.setFieldsValue({ item: customItem });
                        setItemMode('select');
                      }}
                      autoFocus
                    />
                  )}
                </Form.Item>
              </Col>
              <Col span={6}>
                {productMode === 'select' ? (
                  <Form.Item name="product" label="제품명">
                    <Select
                      placeholder="제품명 선택"
                      style={{ width: '100%' }}
                      allowClear
                      onChange={value => {
                        if (value === '__custom__') {
                          setCustomProduct('');
                          consultForm.setFieldsValue({ product: undefined });
                          setProductMode('custom');
                        }
                      }}
                    >
                      {productOptions.map(product => (
                        <Option key={product} value={product}>{product}</Option>
                      ))}
                      <Option value="__custom__">직접입력</Option>
                    </Select>
                  </Form.Item>
                ) : (
                  <Form.Item name="product" label="제품명">
                    <Input
                      placeholder="직접 입력"
                      value={customProduct}
                      onChange={e => setCustomProduct(e.target.value)}
                      onBlur={() => {
                        consultForm.setFieldsValue({ product: customProduct });
                        setProductMode('select');
                      }}
                      autoFocus
                    />
                  </Form.Item>
                )}
              </Col>
              <Col span={6}>
                <Form.Item name="quantity" label="수량">
                  <InputNumber 
                    min={1} 
                    max={999} 
                    placeholder="수량" 
                    style={{ width: '100%' }} 
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Form.Item name="price" label="단가">
                  <InputNumber
                    min={-99999999 as number}
                    step={1000}
                    placeholder="단가 입력"
                    style={{ width: '100%', color: Number(consultForm.getFieldValue('price')) < 0 ? 'red' : undefined }}
                    value={consultForm.getFieldValue('price') === undefined ? undefined : consultForm.getFieldValue('price')}
                    formatter={((value: number | string | undefined) => {
                      if (value === undefined || value === null || value === '') return '';
                      const num = Number(value);
                      if (isNaN(num)) return '';
                      return `${num < 0 ? '-' : ''}${Math.abs(num).toLocaleString()}원`;
                    }) as any}
                    parser={((value: string | undefined) => value ? value.replace(/[^\d-]/g, '') : '') as any}
                    onChange={v => consultForm.setFieldsValue({ price: v })}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="vatType" label="부가세 여부">
                  <Select>
                    <Option value="별도">부가세 별도</Option>
                    <Option value="포함">부가세 포함</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="vatAmount" label="세액" valuePropName="value">
                  <Select
                    placeholder="부가세 선택"
                    options={vatOptions}
                    style={{ width: '100%' }}
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="합계금액">
                  <Text style={{
                    fontSize: 16,
                    lineHeight: '32px',
                    padding: '0 12px',
                    display: 'block',
                    width: '100%',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    background: '#fafafa',
                    height: 32,
                    textAlign: 'right',
                    color: Number(grandTotal) < 0 ? 'red' : undefined
                  }}>
                    {Number(grandTotal) < 0 ? `- ${Math.abs(Number(grandTotal)).toLocaleString()}원` : `${Number(grandTotal).toLocaleString()}원`}
                  </Text>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Form.Item name="note" label="특이사항">
                  <Input placeholder="특이사항 입력" />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <Button 
                type="primary" 
                onClick={handleAdd} 
                disabled={!isFormValid}
                style={{ width: 200 }}
              >
                추가
              </Button>
            </div>
            {/* 상담입력 폼 하단에 제품 상세선택 버튼 추가 */}
            <div style={{ margin: '16px 0', textAlign: 'right' }}>
              <Button
                type="default"
                onClick={() => setProductModalOpen(true)}
                aria-label="제품 상세선택"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') setProductModalOpen(true); }}
                style={{ minWidth: 140, fontWeight: 600, marginRight: 8 }}
              >
                제품 상세선택
              </Button>
            </div>
            <ProductSelectModal
              open={productModalOpen}
              onClose={() => setProductModalOpen(false)}
              onSelect={handleProductSelect}
            />
            {/* 상담입력 폼 하단에 비쥬얼 상세 불러오기 버튼 추가 */}
            <div style={{ margin: '16px 0', textAlign: 'right' }}>
              <Button
                type="dashed"
                onClick={() => setVisualDetailModalOpen(true)}
                aria-label="비쥬얼 상세 불러오기"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') setVisualDetailModalOpen(true); }}
                style={{ minWidth: 160, fontWeight: 600, marginRight: 8 }}
              >
                비쥬얼 상세 불러오기
              </Button>
            </div>
          </Form>
        </Card>
      </div>

      {/* 실시간 상담내역 */}
      <div style={{ marginBottom: 48 }}>
        <Title level={3} style={{ marginBottom: 24, textAlign: 'center' }}>실시간 상담내역</Title>
        <Card style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <Descriptions column={2} size="middle">
            <Descriptions.Item label="상담일시">
              {customerFormData.date ? dayjs(customerFormData.date).format('YYYY-MM-DD HH:mm') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="살롱명">{customerFormData.salon || '-'}</Descriptions.Item>
            <Descriptions.Item label="고객명">{customerFormData.customer || '-'}</Descriptions.Item>
            <Descriptions.Item label="전화번호">{customerFormData.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="주소">{customerFormData.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="인테리어 시작일">
              {customerFormData.interiorStart ? dayjs(customerFormData.interiorStart).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="인테리어 마감일">
              {customerFormData.interiorEnd ? dayjs(customerFormData.interiorEnd).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="입주청소 마감일자">
              {customerFormData.cleaningEnd ? dayjs(customerFormData.cleaningEnd).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="오픈희망 날짜">
              {customerFormData.openHope ? dayjs(customerFormData.openHope).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="기자재 설치 희망일자">
              {formatInstallHopeDates()}
            </Descriptions.Item>
          </Descriptions>
          
          <div style={{ marginTop: 32 }}>
            <DndProvider backend={HTML5Backend}>
              {/* 필터 Select 박스 */}
              <Table
                onChange={handleTableChange}
                columns={columns}
                dataSource={filteredTableData.map((row, idx) => ({
                  ...row,
                  key: row.key || `row-${idx}`,
                }))}
                pagination={false}
                bordered
                rowKey="key"
                components={{
                  body: {
                    row: DraggableBodyRow,
                  },
                }}
                onRow={(record, index) => ({
                  index,
                  moveRow,
                }) as any}
                locale={{ emptyText: '상담 내역이 없습니다.' }}
                size="middle"
              />
            </DndProvider>
          </div>
        </Card>
      </div>

      {/* 실시간 합계 대시보드 */}
      <div style={{ marginBottom: 48 }}>
        <Title level={3} style={{ marginBottom: 24, textAlign: 'center' }}>실시간 결과</Title>
        <Card style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginBottom: 24 }}>
            <Button type="primary" onClick={handleExcelDownload}>엑셀</Button>
            <Button onClick={handleGoogleSheetGuide}>구글시트</Button>
            <Button onClick={handlePdfDownload}>PDF</Button>
          </div>
          <Row gutter={[24, 16]} align="middle">
            <Col span={12}>
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Title level={4} style={{ margin: 0, color: '#1890ff', marginBottom: 12 }}>
                  부가세 포함 합계금액
                </Title>
                <div style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#1890ff', 
                  padding: '16px', 
                  background: '#f0f8ff', 
                  borderRadius: 8, 
                  border: '1px solid #d9d9d9', 
                  minHeight: '60px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {formatMoney(tableData.filter(row => row.vatType === '포함').reduce((sum, row) => sum + row.grandTotal, 0))}
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Title level={4} style={{ margin: 0, color: '#52c41a', marginBottom: 12 }}>
                  부가세 별도 합계금액
                </Title>
                <div style={{ 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  color: '#52c41a', 
                  padding: '16px', 
                  background: '#f6ffed', 
                  borderRadius: 8, 
                  border: '1px solid #d9d9d9', 
                  minHeight: '60px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {formatMoney(tableData.filter(row => row.vatType === '별도').reduce((sum, row) => sum + row.total, 0))}
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </div>

      {/* 수정 모달 */}
      <Modal
        title="상담 내역 수정"
        open={isEditModalVisible}
        onOk={handleEditSave}
        onCancel={handleEditCancel}
        width={800}
        okText="저장"
        cancelText="취소"
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Form.Item name="category" label="카테고리">
                <Select placeholder="카테고리 선택">
                  {categories.map(cat => (
                    <Option key={cat.value} value={cat.value}>{cat.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="item" label="상품/서비스">
                <Select placeholder="상품/서비스 선택">
                  {itemOptions.map(item => (
                    <Option key={item.name} value={item.name}>{item.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="product" label="제품명">
                <Select placeholder="제품명 선택">
                  {productOptions.map(product => (
                    <Option key={product} value={product}>{product}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Form.Item name="quantity" label="수량">
                <InputNumber min={1} max={999} placeholder="수량" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="price" label="단가">
                <InputNumber 
                  min={0} 
                  step={1000} 
                  placeholder="단가" 
                  style={{ width: '100%' }}
                  formatter={(value: any) => value ? `${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}원` : ''}
                  parser={(value: any) => value ? value.replace(/[^\d]/g, '') : ''}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="vatType" label="부가세 여부">
                <Select>
                  <Option value="별도">부가세 별도</Option>
                  <Option value="포함">부가세 포함</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="vatAmount" label="세액">
                <InputNumber 
                  min={0} 
                  step={1000} 
                  placeholder="세액" 
                  style={{ width: '100%' }}
                  formatter={(value: any) => value ? `${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}원` : ''}
                  parser={(value: any) => value ? value.replace(/[^\d]/g, '') : ''}
                  onFocus={() => {
                    const price = consultForm.getFieldValue('price') || 0;
                    consultForm.setFieldsValue({ vatAmount: Math.round(price * 0.1) });
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name="note" label="특이사항">
                <Input placeholder="특이사항 입력" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
      <div style={{ margin: '24px 0', textAlign: 'right' }}>
        <Button
          type="primary"
          onClick={handleSaveHistory}
          aria-label="상담 이력 저장"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') handleSaveHistory(); }}
        >
          상담 이력 저장
        </Button>
        {user?.role === 'admin' && (
          <>
            <Button
              onClick={handleLoadHistory}
              style={{ marginRight: 8, minWidth: 140, fontWeight: 600 }}
              aria-label="상담 이력 불러오기(관리자)"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') handleLoadHistory(); }}
            >
              상담 이력 불러오기(관리자)
            </Button>
            <Button
              onClick={handleLoadVisualList}
              style={{ marginRight: 8, minWidth: 160, fontWeight: 600 }}
              aria-label="비쥬얼 상세 이력(관리자)"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') handleLoadVisualList(); }}
            >
              비쥬얼 상세 이력(관리자)
            </Button>
          </>
        )}
        <Button
          icon={<PictureOutlined />}
          onClick={() => setVisualModalOpen(true)}
          style={{ minWidth: 140, fontWeight: 600 }}
          aria-label="비쥬얼 상세선택"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') setVisualModalOpen(true); }}
        >
          비쥬얼 상세선택
        </Button>
      </div>
      <Modal
        title="비쥬얼 상세선택 (쇼핑몰 스타일)"
        open={visualModalOpen}
        onCancel={() => setVisualModalOpen(false)}
        onOk={handleSaveVisualDetail}
        okText="저장"
        cancelText="취소"
        confirmLoading={visualUploading}
      >
        <div style={{ marginBottom: 16 }}>
          <b>비쥬얼 대표 이미지 업로드</b>
          <Upload
            listType="picture-card"
            fileList={visualImages}
            onChange={handleVisualUpload}
            beforeUpload={file => {
              const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
              if (!isJpgOrPng) {
                alert('jpg, png 파일만 업로드 가능합니다.');
                return Upload.LIST_IGNORE;
              }
              const isLt5M = file.size / 1024 / 1024 < 5;
              if (!isLt5M) {
                alert('이미지 1장당 5MB 이하만 업로드 가능합니다.');
                return Upload.LIST_IGNORE;
              }
              if (visualImages.length >= 8) {
                alert('최대 8장까지 업로드 가능합니다.');
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
            onPreview={async file => {
              let src = file.url;
              if (!src && file.originFileObj) {
                src = await new Promise(resolve => {
                  const reader = new FileReader();
                  if (file.originFileObj) {
                    reader.readAsDataURL(file.originFileObj);
                    reader.onload = () => resolve(reader.result as string);
                  } else {
                    resolve('');
                  }
                });
              }
              if (src) {
                const imgWindow = window.open(src);
                if (imgWindow) imgWindow.document.write(`<img src='${src}' style='max-width:100%' />`);
              }
            }}
            onRemove={file => {
              setVisualImages(prev => prev.filter(f => f.uid !== file.uid));
              return true;
            }}
            multiple
            accept=".jpg,.jpeg,.png"
            showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
          >
            {visualImages.length < 8 && '+ 사진 업로드'}
          </Upload>
        </div>
        <div style={{ marginBottom: 16 }}>
          <b>상세페이지 설명</b>
          <Input.TextArea
            rows={4}
            placeholder="상세페이지 설명을 입력하세요. (최대 500자)"
            value={visualDescription}
            onChange={e => {
              if (e.target.value.length <= 500) setVisualDescription(e.target.value);
            }}
            style={{ marginTop: 8 }}
            maxLength={500}
            showCount
          />
          <div style={{ textAlign: 'right', color: '#888', fontSize: 12 }}>{visualDescription.length} / 500자</div>
        </div>
        <div style={{ marginBottom: 0 }}>
          <b>상세페이지 이미지 업로드</b>
          <Upload
            listType="picture-card"
            fileList={detailImages}
            onChange={({ fileList }) => setDetailImages(fileList)}
            beforeUpload={file => {
              const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
              if (!isJpgOrPng) {
                alert('jpg, png 파일만 업로드 가능합니다.');
                return Upload.LIST_IGNORE;
              }
              const isLt5M = file.size / 1024 / 1024 < 5;
              if (!isLt5M) {
                alert('이미지 1장당 5MB 이하만 업로드 가능합니다.');
                return Upload.LIST_IGNORE;
              }
              if (detailImages.length >= 8) {
                alert('최대 8장까지 업로드 가능합니다.');
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
            onPreview={async file => {
              let src = file.url;
              if (!src && file.originFileObj) {
                src = await new Promise(resolve => {
                  const reader = new FileReader();
                  if (file.originFileObj) {
                    reader.readAsDataURL(file.originFileObj);
                    reader.onload = () => resolve(reader.result as string);
                  } else {
                    resolve('');
                  }
                });
              }
              if (src) {
                const imgWindow = window.open(src);
                if (imgWindow) imgWindow.document.write(`<img src='${src}' style='max-width:100%' />`);
              }
            }}
            onRemove={file => {
              setDetailImages(prev => prev.filter(f => f.uid !== file.uid));
              return true;
            }}
            multiple
            accept=".jpg,.jpeg,.png"
            showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
          >
            {detailImages.length < 8 && '+ 상세 이미지 업로드'}
          </Upload>
        </div>
      </Modal>
      {/* 관리자용 상담 이력 리스트 모달 */}
      <Modal
        title="상담 이력 리스트 (관리자 전용)"
        open={historyModalOpen}
        onCancel={() => setHistoryModalOpen(false)}
        footer={null}
        width={900}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button onClick={handleExcelDownload} type="primary">엑셀 다운로드</Button>
          <Button onClick={handleCsvDownload}>CSV 다운로드</Button>
          <Button onClick={handlePdfDownload}>PDF 다운로드</Button>
          <Input
            placeholder="고객명 검색"
            value={searchCustomer}
            onChange={e => setSearchCustomer(e.target.value)}
            style={{ width: 160 }}
            aria-label="고객명 검색"
            tabIndex={0}
          />
          <Select placeholder="카테고리" allowClear value={searchCategory} onChange={v => setSearchCategory(v)} style={{ width: 140 }}>
            <Select.Option value="equipment">미용기자재</Select.Option>
            <Select.Option value="material">미용재료</Select.Option>
            <Select.Option value="interior">인테리어</Select.Option>
            <Select.Option value="education">교육</Select.Option>
          </Select>
          <DatePicker placeholder="상담일" value={searchDate} onChange={setSearchDate} style={{ width: 130 }} />
        </div>
        <Table
          dataSource={filteredHistoryList}
          columns={[
            { title: '고객정보', dataIndex: ['customerFormData', 'customer'], key: 'customer' },
            { title: '상담일', dataIndex: ['customerFormData', 'date'], key: 'date', render: (v) => String(v) },
            { title: '상담내용', dataIndex: ['consultFormData', 'category'], key: 'category' },
            { title: '상세', dataIndex: ['consultFormData', 'item'], key: 'item' },
            { title: '총합계', dataIndex: ['tableData'], key: 'tableData', render: (v) => Array.isArray(v) ? v.reduce((sum, row) => sum + (row.total || 0), 0) : 0 },
            { title: '등록일', dataIndex: 'createdAt', key: 'createdAt', render: (v) => v?.toDate?.().toLocaleString?.() || String(v) },
            {
              title: '액션',
              key: 'action',
              render: (_, record, idx) => (
                <Space>
                  <Button size="small" onClick={() => handleShowHistoryDetail(record)} aria-label="상세보기">상세</Button>
                  <Popconfirm title="정말 삭제하시겠습니까?" onConfirm={() => handleDeleteHistory(idx)} okText="삭제" cancelText="취소">
                    <Button size="small" danger aria-label="삭제">삭제</Button>
                  </Popconfirm>
                </Space>
              )
            }
          ]}
          rowKey={(_, idx) => String(idx)}
          pagination={{ pageSize: 5 }}
        />
      </Modal>
      {/* 상담 이력 상세 모달 추가 (historyDetailModalOpen, selectedHistory 활용) */}
      <Modal
        title="상담 이력 상세"
        open={historyDetailModalOpen}
        onCancel={() => setHistoryDetailModalOpen(false)}
        footer={null}
        width={700}
      >
        {selectedHistory && (
          <div>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="고객명">{selectedHistory.customerFormData?.customer}</Descriptions.Item>
              <Descriptions.Item label="상담일">{String(selectedHistory.customerFormData?.date)}</Descriptions.Item>
              <Descriptions.Item label="살롱명">{selectedHistory.customerFormData?.salon}</Descriptions.Item>
              <Descriptions.Item label="전화번호">{selectedHistory.customerFormData?.phone}</Descriptions.Item>
              <Descriptions.Item label="주소">{selectedHistory.customerFormData?.address}</Descriptions.Item>
              <Descriptions.Item label="카테고리">{selectedHistory.consultFormData?.category}</Descriptions.Item>
              <Descriptions.Item label="상품/서비스">{selectedHistory.consultFormData?.item}</Descriptions.Item>
              <Descriptions.Item label="제품명">{selectedHistory.consultFormData?.product}</Descriptions.Item>
              <Descriptions.Item label="수량">{selectedHistory.consultFormData?.quantity}</Descriptions.Item>
              <Descriptions.Item label="단가">{selectedHistory.consultFormData?.price}</Descriptions.Item>
              <Descriptions.Item label="부가세여부">{selectedHistory.consultFormData?.vatType}</Descriptions.Item>
              <Descriptions.Item label="세액">{selectedHistory.consultFormData?.vatAmount}</Descriptions.Item>
              <Descriptions.Item label="특이사항">{selectedHistory.consultFormData?.note}</Descriptions.Item>
              <Descriptions.Item label="등록일">{selectedHistory.createdAt?.toDate?.().toLocaleString?.() || String(selectedHistory.createdAt)}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <b>상담 테이블</b>
              <Table
                dataSource={selectedHistory.tableData || []}
                columns={[
                  { title: '카테고리', dataIndex: 'category', key: 'category' },
                  { title: '상품/서비스', dataIndex: 'item', key: 'item' },
                  { title: '제품명', dataIndex: 'product', key: 'product' },
                  { title: '수량', dataIndex: 'quantity', key: 'quantity' },
                  { title: '단가', dataIndex: 'price', key: 'price' },
                  { title: '합계', dataIndex: 'total', key: 'total' },
                  { title: '부가세', dataIndex: 'vatAmount', key: 'vatAmount' },
                  { title: '총합계', dataIndex: 'grandTotal', key: 'grandTotal' },
                  { title: '비고', dataIndex: 'note', key: 'note' },
                ]}
                rowKey={(_, idx) => String(idx)}
                size="small"
                pagination={false}
              />
            </div>
          </div>
        )}
      </Modal>
      {/* 비쥬얼 상세 불러오기 모달 */}
      <Modal
        open={visualDetailModalOpen}
        onCancel={() => setVisualDetailModalOpen(false)}
        footer={null}
        title="비쥬얼 상세 불러오기"
        width={1000}
      >
        <Input.Search
          placeholder="설명/날짜로 검색"
          value={visualDetailSearch}
          onChange={e => setVisualDetailSearch(e.target.value)}
          style={{ marginBottom: 24, maxWidth: 400 }}
        />
        {visualDetailLoading ? (
          <Spin style={{ display: 'block', margin: '40px auto' }} />
        ) : (
          <Row gutter={[16, 16]}>
            {visualDetailList.filter(vd =>
              !visualDetailSearch ||
              (vd.description && vd.description.includes(visualDetailSearch)) ||
              (vd.createdAt && vd.createdAt.toDate && vd.createdAt.toDate().toLocaleDateString().includes(visualDetailSearch))
            ).map((vd, idx) => (
              <Col span={8} key={vd.docId}>
                <Card
                  hoverable
                  style={{ marginBottom: 8 }}
                  cover={vd.images && vd.images[0] ? <img src={vd.images[0]} alt="대표 이미지" style={{ height: 180, objectFit: 'cover' }} /> : null}
                  onClick={() => {
                    setVisualImages(urlToFileList(vd.images, 'visual'));
                    setDetailImages(urlToFileList(vd.detailImages, 'detail'));
                    setVisualDescription(vd.description || '');
                    setVisualDetailModalOpen(false);
                  }}
                >
                  <div style={{ marginBottom: 8 }}><b>설명:</b> {vd.description}</div>
                  <div style={{ marginBottom: 8 }}>
                    <b>상세 이미지:</b>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {vd.detailImages && vd.detailImages.map((img: string, i: number) => (
                        <img key={i} src={img} alt="상세" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ color: '#888', fontSize: 12 }}>
                    {vd.createdAt && vd.createdAt.toDate ? vd.createdAt.toDate().toLocaleString() : ''}
                  </div>
                </Card>
              </Col>
            ))}
            {visualDetailList.length === 0 && !visualDetailLoading && (
              <Col span={24} style={{ textAlign: 'center', color: '#aaa', padding: '40px 0' }}>
                저장된 비쥬얼 상세가 없습니다.
              </Col>
            )}
          </Row>
        )}
      </Modal>
      {/* 관리자만 보이는 비쥬얼 상세 관리 버튼 */}
      {user?.role === 'admin' && (
        <div style={{ margin: '16px 0', textAlign: 'right' }}>
          <Button
            type="primary"
            onClick={() => setVisualAdminModalOpen(true)}
            aria-label="비쥬얼 상세 관리"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') setVisualAdminModalOpen(true); }}
            style={{ minWidth: 180, fontWeight: 600 }}
          >
            비쥬얼 상세 관리 (관리자)
          </Button>
        </div>
      )}
      {/* 비쥬얼 상세 관리 모달 */}
      <Modal
        open={visualAdminModalOpen}
        onCancel={() => setVisualAdminModalOpen(false)}
        footer={null}
        title="비쥬얼 상세 관리 (관리자)"
        width={1000}
      >
        <Input.Search
          placeholder="설명/날짜로 검색"
          value={visualDetailSearch}
          onChange={e => setVisualDetailSearch(e.target.value)}
          style={{ marginBottom: 24, maxWidth: 400 }}
        />
        {visualDetailLoading ? (
          <Spin style={{ display: 'block', margin: '40px auto' }} />
        ) : (
          <Row gutter={[16, 16]}>
            {visualDetailList.filter(vd =>
              !visualDetailSearch ||
              (vd.description && vd.description.includes(visualDetailSearch)) ||
              (vd.createdAt && vd.createdAt.toDate && vd.createdAt.toDate().toLocaleDateString().includes(visualDetailSearch))
            ).map((vd, idx) => (
              <Col span={8} key={vd.docId}>
                <Card
                  hoverable
                  style={{ marginBottom: 8 }}
                  cover={vd.images && vd.images[0] ? <img src={vd.images[0]} alt="대표 이미지" style={{ height: 180, objectFit: 'cover' }} /> : null}
                  actions={[
                    <Button danger size="small" onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm('정말 삭제하시겠습니까?')) {
                        await deleteDoc(doc(db, 'visualDetails', vd.docId));
                        setVisualDetailList(list => list.filter(item => item.docId !== vd.docId));
                      }
                    }}>삭제</Button>
                  ]}
                >
                  <div style={{ marginBottom: 8 }}><b>설명:</b> {vd.description}</div>
                  <div style={{ marginBottom: 8 }}>
                    <b>상세 이미지:</b>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {vd.detailImages && vd.detailImages.map((img: string, i: number) => (
                        <img key={i} src={img} alt="상세" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ color: '#888', fontSize: 12 }}>
                    {vd.createdAt && vd.createdAt.toDate ? vd.createdAt.toDate().toLocaleString() : ''}
                  </div>
                </Card>
              </Col>
            ))}
            {visualDetailList.length === 0 && !visualDetailLoading && (
              <Col span={24} style={{ textAlign: 'center', color: '#aaa', padding: '40px 0' }}>
                저장된 비쥬얼 상세가 없습니다.
              </Col>
            )}
          </Row>
        )}
      </Modal>
    </div>
  );
};

export default ConsultationForm; 