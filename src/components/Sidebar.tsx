"use client"

import { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import type { RootState } from '../app/store';
import { selectMenu } from '../app/store';

const menuItems = [
  {
    label: 'OddsFinders',
    subItems: ['OddsMatcher', 'Dutcher', 'Trimacther', 'Best Odds'],
  },
  {
    label: 'Offline Tools',
    subItems: ['Punta Banca', 'Punta Punta', 'Punta Tre Vie', 'Multipla', 'Condizionale', 'Converter', 'Casino'],
  },
  {
    label: 'Tracker',
    subItems: ['In Corso', 'Terminate', 'Casino and Games', 'Wallets', 'Utenti', 'Reports'],
  },
  {
    label: 'Account',
    subItems: ['Settings', 'Profile'],
  },
];

const folderMap: Record<string, string> = {
  'OddsFinders': 'odds-finder',
  'Offline Tools': 'offline-tools',
  'Tracker': 'tracker',
  'Account': 'account',
};

const subMenuSlugMap: Record<string, Record<string, string>> = {
  'tracker': {
    'In Corso': 'in-corso',
    'Terminate': 'terminate',
    'Casino and Games': 'casino-and-games',
    'Wallets': 'wallets',
    'Utenti': 'utenti',
    'Reports': 'reports',
  },
  'offline-tools': {
    'Punta Banca': 'punta-banca',
    'Punta Punta': 'punta-punta',
    'Punta Tre Vie': 'punta-tre-vie',
    'Multipla': 'multipla',
    'Condizionale': 'condizionale',
    'Converter': 'converter',
    'Casino': 'casino',
  },
  'odds-finder': {
    'OddsMatcher': 'odds-matcher',
    'Dutcher': 'dutcher',
    'Trimacther': 'trimatcher',
    'Best Odds': 'best-odds',
  },
  'account': {
    'Settings': 'settings',
    'Profile': 'profile',
  },
};

export default function Sidebar() {
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('openMenus');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const dispatch = useDispatch();
  const router = useRouter();
  const selectedSubMenu = useSelector((state: RootState) => state.navigation.selectedSubMenu);

  useEffect(() => {
    localStorage.setItem('openMenus', JSON.stringify(openMenus));
  }, [openMenus]);

  useEffect(() => {
    if (selectedSubMenu) {
      const parentMenu = menuItems.find(item =>
        item.subItems.includes(selectedSubMenu)
      );
      if (parentMenu && !openMenus[parentMenu.label]) {
        setOpenMenus(prev => ({
          ...prev,
          [parentMenu.label]: true,
        }));
      }
    }
    // Only run this effect on mount and when selectedSubMenu changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubMenu]);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleSubMenuClick = (menu: string, sub: string) => {
    dispatch(selectMenu({ menu, subMenu: sub }));
    const folder = folderMap[menu] || menu.replace(/ /g, '');
    const subSlug = subMenuSlugMap[folder]?.[sub] || sub.replace(/ /g, '-').toLowerCase();
    const path = `/dashboard/${folder}/${subSlug}`;
    router.push(path);
  };

  return (
    <aside className={styles.sidebar}>
      <div style={{
        fontWeight: 700,
        fontSize: 18,
        padding: '24px 20px 12px 20px',
        textAlign: 'center',
        letterSpacing: '0.02em',
        color: '#000',
        borderBottom: '1px solid #f1f1f1',
        marginBottom: 8,
      }}>
        Matched Betting Management System
      </div>
      <nav className={styles.menu}>
        <ul className={styles.menuList}>
          {menuItems.map((item) => (
            <li className={styles.menuItem} key={item.label}>
              <button
                className={
                  styles.menuButton +
                  ' ' +
                  (openMenus[item.label] ? styles.menuButtonActive : '')
                }
                onClick={() => toggleMenu(item.label)}
              >
                <span className="flex-1">{item.label}</span>
                {item.subItems.length > 0 && (
                  <svg
                    className={
                      styles.arrow +
                      ' ' +
                      (openMenus[item.label] ? styles.arrowOpen : '')
                    }
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    width={16}
                    height={16}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
              {item.subItems.length > 0 && (
                <ul
                  className={
                    styles.subMenuList +
                    ' ' +
                    (openMenus[item.label] ? styles.subMenuListOpen : '')
                  }
                >
                  {openMenus[item.label] &&
                    item.subItems.map((sub) => (
                      <li key={sub}>
                        <button
                          className={
                            styles.subMenuButton +
                            (selectedSubMenu === sub ? ' ' + styles.subMenuButtonActive : '')
                          }
                          onClick={() => handleSubMenuClick(item.label, sub)}
                        >
                          <span className={styles.subMenuHyphen}>-</span>
                          <span>{sub}</span>
                          <span className={styles.subMenuArrow}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <button
        className={styles.logoutButton}
        onClick={() => {
          // Placeholder: Add your logout logic here
          alert('Logout clicked!');
        }}
      >
        Logout
      </button>
    </aside>
  );
} 