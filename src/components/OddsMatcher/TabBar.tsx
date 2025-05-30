'use client'

import React, { useState } from 'react';
import styles from './TabBar.module.css';
import MultiSelectDropdown from './MultiSelectDropdown';

const sports = [
  { label: 'Soccer', icon: '⚽' },
  { label: 'Tennis', icon: '🎾' },
  { label: 'Basketball', icon: '🏀' },
  { label: 'Volley', icon: '🏐' },
];

const markets = [
  { label: '1X2' },
  { label: 'Under/Over' },
  { label: 'Goal/No Goal' },
  { label: 'TT' },
];

const initialFilters = {
  sports: sports.map(s => s.label),
  markets: markets.map(m => m.label),
  minLiquidity: '',
  rating: '',
  minOdd: '',
  maxOdd: '',
  startTime: '',
  endTime: '',
};

const TabBar = () => {
  const [activeTab, setActiveTab] = useState('Filtri');
  const [filters, setFilters] = useState(initialFilters);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFilters(initialFilters);
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabContainer}>
        {['Bookmakers', 'Filtri', 'Multipla'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`${styles.tabButton} ${activeTab === tab ? styles.tabButtonActive : styles.tabButtonInactive}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div>
        {activeTab === 'Filtri' && (
          <div className={styles.filtersContainer}>
            {/* Sports Filter */}
            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>           
                <div className={styles.filterSection}>
                    <MultiSelectDropdown
                        label="Sport"
                        options={sports}
                        selectedOptions={filters.sports}
                        onChange={selected => setFilters(prev => ({ ...prev, sports: selected }))}
                    />
                </div>
                {/* Markets Filter */}
                <div className={styles.filterSection}>
                    <MultiSelectDropdown
                        label="Mercato"
                        options={markets}
                        selectedOptions={filters.markets}
                        onChange={selected => setFilters(prev => ({ ...prev, markets: selected }))}
                    />
                </div>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                {/* Min Liquidity */}
                <div className={styles.filterSection}>
                    <div className={styles.filterTitle}>Liquidità, Rating e Quote</div>
                    <div style={{display: 'flex', gap: 10}}>
                        <div className={styles.inputWrapper}>
                            <span className={styles.inputIcon}>€</span>
                            <input
                                type="number"
                                name="minLiquidity"
                                value={filters.minLiquidity}
                                onChange={handleInputChange}
                                placeholder="Liquidità"
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.inputWrapper}>
                            <span className={styles.inputIcon}>%</span>
                            <input
                                type="number"
                                name="rating"
                                value={filters.rating}
                                onChange={handleInputChange}
                                placeholder="Rating"
                                className={styles.input}
                            />
                        </div>
                    </div>
                    <div style={{display: 'flex', gap: 10, marginTop: 10}}>
                        <div className={styles.inputWrapper}>
                            <span className={styles.inputIcon}>&#8250;</span>
                            <input
                                type="number"
                                name="minOdd"
                                value={filters.minOdd}
                                onChange={handleInputChange}
                                placeholder="Quota Min"
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.inputWrapper}>
                            <span className={styles.inputIcon}>&#8249;</span>
                            <input
                                type="number"
                                name="maxOdd"
                                value={filters.maxOdd}
                                onChange={handleInputChange}
                                placeholder="Quota Max"
                                className={styles.input}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                {/* Start Time */}
                <div className={styles.filterSection}>
                    <div className={styles.filterTitle}>Filtri Data</div>
                    <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>📅</span>
                        <input
                            placeholder="Data/Ora inizio"
                            type="datetime-local"
                            name="startTime"
                            value={filters.startTime}
                            onChange={handleInputChange}
                            className={styles.dateInput}
                        />
                    </div>
                    <div className={styles.inputWrapper} style={{marginTop: 10}}>
                        <span className={styles.inputIcon}>📅</span>
                        <input
                            placeholder="Data/Ora fine"
                            type="datetime-local"
                            name="endTime"
                            value={filters.endTime}
                            onChange={handleInputChange}
                            className={styles.dateInput}
                        />
                    </div>
                </div>
            </div>
 
            {/* Reset Button */}
            <div className={styles.resetButtonContainer}>
              <button
                onClick={handleReset}
                className={styles.resetButton}
              >
                RESET FILTRI
              </button>
            </div>
          </div>
        )}
        {/* {activeTab === 'Bookmakers' && (
          <div>Bookmakers tab content</div>
        )}
        {activeTab === 'Multipla' && (
          <div>Multipla tab content</div>
        )} */}
      </div>
    </div>
  );
};

export default TabBar; 