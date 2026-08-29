export interface Message {
  id: string;
  role: 'user' | 'ai' | 'human';
  content: string;
  timestamp: any; // Firebase Timestamp
}

export interface Chat {
  id: string;
  customerName: string;
  status: 'active' | 'archived';
  aiEnabled: boolean;
  lastMessage: string;
  lastMessageAt: any; // Firebase Timestamp
}
