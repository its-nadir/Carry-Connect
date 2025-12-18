/* Notification Dropdown Styles */
.notification-container {
  position: relative;
  display: inline-block;
}

.notifications-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 350px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  margin-top: 10px;
  z-index: 1000;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.notifications-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.notifications-header a {
  font-size: 14px;
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.notifications-header a:hover {
  text-decoration: underline;
}

.notifications-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  position: relative;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: #f9fafb;
}

.notification-item.unread {
  background-color: #f0f9ff;
}

.notification-item.unread:hover {
  background-color: #e0f2fe;
}

.notification-icon {
  margin-right: 12px;
  color: #6b7280;
  font-size: 18px;
  margin-top: 2px;
}

.notification-content {
  flex: 1;
}

.notification-message {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #111827;
  line-height: 1.4;
}

.notification-time {
  font-size: 12px;
  color: #6b7280;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background-color: #3b82f6;
  border-radius: 50%;
  margin-left: 8px;
  margin-top: 6px;
}

.no-notifications {
  padding: 32px 16px;
  text-align: center;
  color: #6b7280;
}

.no-notifications i {
  font-size: 32px;
  margin-bottom: 12px;
  color: #d1d5db;
}

.no-notifications p {
  margin: 0;
  font-size: 14px;
}

.notifications-footer {
  padding: 12px 16px;
  text-align: center;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.notifications-footer a {
  font-size: 14px;
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.notifications-footer a:hover {
  text-decoration: underline;
}

/* Scrollbar styling */
.notifications-list::-webkit-scrollbar {
  width: 6px;
}

.notifications-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.notifications-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.notifications-list::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
