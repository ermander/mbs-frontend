"use client"

import { useState } from 'react';
import styles from './Sidebar.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import type { RootState } from '../app/store';
import { selectMenu } from '../app/store';

const menuItems = [
  {
    label: 'OddsFinders',
    subItems: ['OddsMatcher', 'Dutcher', 'Trimacther'],
  },
  {
    label: 'Offline Tools',
    subItems: ['Punta Banca', 'Punta Punta', 'Punta Tre Vie'],
  },
  {
    label: 'Tracker',
    subItems: ['In Corso', 'Terminate', 'Casino and Games', 'Wallets', 'Utenti', 'Reports'],
  },
  {
    label: 'Settings',
    subItems: [],
  },
];

export default function Sidebar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const dispatch = useDispatch();
  const router = useRouter();
  const selectedSubMenu = useSelector((state: RootState) => state.navigation.selectedSubMenu);

  const toggleMenu = (label: string) => {
    setOpenMenu((prev) => (prev === label ? null : label));
  };

  const handleSubMenuClick = (menu: string, sub: string) => {
    dispatch(selectMenu({ menu, subMenu: sub }));
    // Build the path for navigation
    const path = `/dashboard/${encodeURIComponent(sub)}`;
    router.push(path);
  };

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.menu}>
        <ul className={styles.menuList}>
          {menuItems.map((item) => (
            <li className={styles.menuItem} key={item.label}>
              <button
                className={
                  styles.menuButton +
                  ' ' +
                  (openMenu === item.label ? styles.menuButtonActive : '')
                }
                onClick={() => toggleMenu(item.label)}
              >
                <span className="flex-1">{item.label}</span>
                {item.subItems.length > 0 && (
                  <svg
                    className={
                      styles.arrow +
                      ' ' +
                      (openMenu === item.label ? styles.arrowOpen : '')
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
                    (openMenu === item.label ? styles.subMenuListOpen : '')
                  }
                >
                  {openMenu === item.label &&
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
    </aside>
  );
} 