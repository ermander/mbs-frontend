'use client';
import styles from './BookExchangeControls.module.css';

import type { SelectProps } from 'antd';
import { Button, Col, InputNumber, Row, Select } from 'antd';

const options: SelectProps['options'] = [
  { value: 'bet365', label: 'Bet365' },
  { value: 'unibet', label: 'Unibet' },
  { value: 'william_hill', label: 'William Hill' },
  { value: 'paddy_power', label: 'Paddy Power' },
  { value: 'bwin', label: 'Bwin' },
  { value: '888sport', label: '888sport' },
  { value: 'leovegas', label: 'LeoVegas' },
  { value: 'mr_green', label: 'Mr Green' },
  { value: 'casumo', label: 'Casumo' },
  { value: 'comeon', label: 'ComeOn' },
  { value: 'nordicbet', label: 'NordicBet' },
  { value: 'marathonbet', label: 'MarathonBet' },
  { value: 'sportingbet', label: 'Sportingbet' },
  { value: 'ladbrokes', label: 'Ladbrokes' },
  { value: 'coral', label: 'Coral' },
  { value: 'betfair', label: 'Betfair' },
  { value: 'skybet', label: 'SkyBet' },
  { value: 'paf', label: 'PAF' },
  { value: 'mrbit', label: 'MrBit' },
  { value: 'vulkanbet', label: 'VulkanBet' }
];

const BookExchangeControls = () => {
  const handleChange = (value: string[]) => {
    console.log(`selected ${value}`);
  };

  return (
    <div className={styles.container}>
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={6}>
          <Select
            mode="tags"
            style={{ width: '100%' }}
            placeholder="Bookmaker"
            onChange={handleChange}
            options={options}
          />
        </Col>
        <Col span={6}>
          <Select
            mode="tags"
            style={{ width: '100%' }}
            placeholder="Exchange"
            onChange={handleChange}
            options={options}
          />
        </Col>
        <Col span={4}>
          <InputNumber addonAfter="€" defaultValue={100} placeholder='Puntata'/>
        </Col>
        <Col span={4}>
          <InputNumber addonAfter="€" defaultValue={100} placeholder='Rimborso'/>
        </Col>
        <Col span={4}>
          <Button type="primary" className={styles.buttonResetCR}>Reset CR%</Button>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={10}>
          <Select
            mode="tags"
            style={{ width: '100%' }}
            placeholder="Seleziona evento o torneo"
            onChange={handleChange}
            options={options}
          />
        </Col>
        <Col span={10}>
          <Select
            mode="tags"
            style={{ width: '100%' }}
            placeholder="Escludi evento o torneo"
            onChange={handleChange}
            options={options}
          />
        </Col>
        <Col span={4}>
          <Button type="primary" className={styles.buttonReset}>Reset</Button>
        </Col>
      </Row>
    </div>
  );
};

export default BookExchangeControls; 