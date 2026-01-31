import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthModal } from '@/components/AuthModal';
import { API_URLS, getAuthToken, clearAuthToken, getAuthHeaders } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

type UserRole = 'владелец' | 'администратор' | 'VIP' | 'пользователь';

interface User {
  id: number;
  username: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  role: UserRole;
  is_banned: boolean;
  ban_reason?: string;
}

interface Chat {
  id: number;
  other_user: {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  last_message?: string;
  last_message_time?: string;
}

interface Message {
  id: number;
  content: string;
  sender_id: number;
  created_at: string;
  sender: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

const Index = () => {
  const { toast } = useToast();
  const [showAuth, setShowAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState<'chats' | 'contacts' | 'profile' | 'settings' | 'admin' | 'notifications'>('chats');
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      loadCurrentUser();
    } else {
      setShowAuth(true);
    }
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await fetch(`${API_URLS.USERS}?action=me`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error();
      
      const data = await response.json();
      setCurrentUser(data);
      loadChats();
      loadContacts();
    } catch {
      clearAuthToken();
      setShowAuth(true);
    }
  };

  const loadChats = async () => {
    try {
      const response = await fetch(`${API_URLS.CHATS}?action=list`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Load chats error:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await fetch(`${API_URLS.CHATS}?action=contacts`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Load contacts error:', error);
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const response = await fetch(`${API_URLS.CHATS}?action=messages&chat_id=${chatId}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Load messages error:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await fetch(`${API_URLS.USERS}?action=search&q=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const createChat = async (userId: number) => {
    try {
      const response = await fetch(`${API_URLS.CHATS}?action=create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: userId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
        return;
      }
      
      loadChats();
      const newChat = chats.find(c => c.id === data.chat_id);
      if (newChat) {
        setSelectedChat(newChat);
        loadMessages(data.chat_id);
      }
      setActiveSection('chats');
      toast({ title: 'Успешно', description: 'Чат создан' });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedChat) return;
    
    try {
      const response = await fetch(`${API_URLS.CHATS}?action=send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          chat_id: selectedChat.id,
          content: messageInput
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      
      setMessageInput('');
      loadMessages(selectedChat.id);
      loadChats();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  };

  const addContact = async (userId: number) => {
    try {
      const response = await fetch(`${API_URLS.CHATS}?action=add-contact`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: userId })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      
      loadContacts();
      toast({ title: 'Успешно', description: 'Контакт добавлен' });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        const response = await fetch(API_URLS.UPLOAD, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ image: base64 })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error);
        }
        
        await updateProfile({ avatar_url: data.url });
        toast({ title: 'Успешно', description: 'Аватар обновлён' });
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  };

  const updateProfile = async (updates: { display_name?: string; avatar_url?: string }) => {
    try {
      const payload = {
        display_name: updates.display_name || currentUser?.display_name,
        avatar_url: updates.avatar_url || currentUser?.avatar_url || ''
      };
      
      const response = await fetch(`${API_URLS.USERS}?action=profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      
      loadCurrentUser();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await fetch(`${API_URLS.USERS}?action=list`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Load users error:', error);
    }
  };

  const banUser = async (userId: number, reason: string) => {
    try {
      const response = await fetch(`${API_URLS.USERS}?action=ban`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: userId, reason })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      
      loadAllUsers();
      toast({ title: 'Успешно', description: 'Пользователь заблокирован' });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  };

  const unbanUser = async (userId: number) => {
    try {
      const response = await fetch(`${API_URLS.USERS}?action=unban`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: userId })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      
      loadAllUsers();
      toast({ title: 'Успешно', description: 'Пользователь разблокирован' });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  };

  const setUserRole = async (userId: number, role: UserRole) => {
    try {
      const response = await fetch(`${API_URLS.USERS}?action=set-role`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: userId, role })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      
      loadAllUsers();
      toast({ title: 'Успешно', description: 'Роль изменена' });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'владелец': return 'bg-yellow-500 hover:bg-yellow-600 text-gray-900';
      case 'администратор': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'VIP': return 'bg-purple-500 hover:bg-purple-600 text-white';
      case 'пользователь': return 'bg-gray-400 hover:bg-gray-500 text-white';
    }
  };

  useEffect(() => {
    if (activeSection === 'admin') {
      loadAllUsers();
    }
  }, [activeSection]);

  const handleChatClick = (chat: Chat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 86400000) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ru-RU');
  };

  if (!currentUser) {
    return <AuthModal open={showAuth} onClose={() => {}} onSuccess={() => {
      setShowAuth(false);
      loadCurrentUser();
    }} />;
  }

  return (
    <div className="flex h-screen bg-white">
      <aside className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 space-y-8">
        <div className="text-2xl font-bold text-yellow-500">TC</div>
        
        <nav className="flex flex-col space-y-6">
          <button onClick={() => setActiveSection('chats')} className={`p-3 rounded-xl transition-all ${activeSection === 'chats' ? 'bg-yellow-400 text-gray-900' : 'text-gray-600 hover:bg-yellow-50'}`}>
            <Icon name="MessageSquare" size={24} />
          </button>
          <button onClick={() => setActiveSection('contacts')} className={`p-3 rounded-xl transition-all ${activeSection === 'contacts' ? 'bg-yellow-400 text-gray-900' : 'text-gray-600 hover:bg-yellow-50'}`}>
            <Icon name="Users" size={24} />
          </button>
          <button onClick={() => setActiveSection('profile')} className={`p-3 rounded-xl transition-all ${activeSection === 'profile' ? 'bg-yellow-400 text-gray-900' : 'text-gray-600 hover:bg-yellow-50'}`}>
            <Icon name="User" size={24} />
          </button>
          <button onClick={() => setActiveSection('settings')} className={`p-3 rounded-xl transition-all ${activeSection === 'settings' ? 'bg-yellow-400 text-gray-900' : 'text-gray-600 hover:bg-yellow-50'}`}>
            <Icon name="Settings" size={24} />
          </button>
          {(currentUser.role === 'владелец' || currentUser.role === 'администратор') && (
            <button onClick={() => setActiveSection('admin')} className={`p-3 rounded-xl transition-all ${activeSection === 'admin' ? 'bg-yellow-400 text-gray-900' : 'text-gray-600 hover:bg-yellow-50'}`}>
              <Icon name="Shield" size={24} />
            </button>
          )}
          <button onClick={() => setActiveSection('notifications')} className={`p-3 rounded-xl transition-all relative ${activeSection === 'notifications' ? 'bg-yellow-400 text-gray-900' : 'text-gray-600 hover:bg-yellow-50'}`}>
            <Icon name="Bell" size={24} />
          </button>
        </nav>

        <div className="mt-auto">
          <button onClick={() => {
            clearAuthToken();
            setCurrentUser(null);
            setShowAuth(true);
          }} className="p-3 rounded-xl text-red-600 hover:bg-red-50">
            <Icon name="LogOut" size={24} />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeSection === 'chats' && (
          <div className="flex flex-1 overflow-hidden">
            <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Чаты</h1>
                </div>
                <div className="relative">
                  <Icon name="Search" size={20} className="absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Найти пользователя..."
                    className="pl-10 bg-gray-50 border-gray-200"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                  />
                </div>
              </div>

              {searchQuery && searchResults.length > 0 ? (
                <div className="flex-1 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div key={user.id} className="px-6 py-4 hover:bg-yellow-50 cursor-pointer transition-colors border-b border-gray-100" onClick={() => {
                      createChat(user.id);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-yellow-400 text-gray-900">{user.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-gray-900">{user.display_name}</p>
                          <p className="text-xs text-gray-400">@{user.username}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {chats.map((chat) => (
                    <div key={chat.id} className={`px-6 py-4 hover:bg-yellow-50 cursor-pointer transition-colors border-b border-gray-100 ${selectedChat?.id === chat.id ? 'bg-yellow-50' : ''}`} onClick={() => handleChatClick(chat)}>
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarImage src={chat.other_user.avatar_url} />
                          <AvatarFallback className="bg-yellow-400 text-gray-900">{chat.other_user.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-900">{chat.other_user.display_name}</span>
                            <span className="text-xs text-gray-500">{formatTime(chat.last_message_time)}</span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{chat.last_message || 'Нет сообщений'}</p>
                          <span className="text-xs text-gray-400">@{chat.other_user.username}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {chats.length === 0 && !searchQuery && (
                    <div className="p-6 text-center text-gray-500">
                      <p>Нет чатов</p>
                      <p className="text-sm mt-2">Найдите пользователя выше</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedChat ? (
              <div className="flex-1 flex flex-col bg-gray-50">
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedChat.other_user.avatar_url} />
                      <AvatarFallback className="bg-yellow-400 text-gray-900">{selectedChat.other_user.display_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold text-gray-900">{selectedChat.other_user.display_name}</h2>
                      <p className="text-sm text-gray-500">@{selectedChat.other_user.username}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`rounded-2xl px-4 py-3 max-w-xs shadow-sm ${message.sender_id === currentUser.id ? 'bg-yellow-400 rounded-tr-sm' : 'bg-white rounded-tl-sm'}`}>
                        <p className="text-gray-900">{message.content}</p>
                        <span className={`text-xs mt-1 block ${message.sender_id === currentUser.id ? 'text-gray-700' : 'text-gray-400'}`}>{formatTime(message.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white border-t border-gray-200 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Введите сообщение..."
                      className="flex-1 bg-gray-50 border-gray-200"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <Button className="bg-yellow-400 hover:bg-yellow-500 text-gray-900" onClick={sendMessage}>
                      <Icon name="Send" size={20} />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-500">
                  <Icon name="MessageSquare" size={64} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Выберите чат</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'contacts' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Контакты</h1>

              <div className="relative mb-6">
                <Icon name="Search" size={20} className="absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Найти пользователя..."
                  className="pl-10 bg-white border-gray-200"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                />
              </div>

              {searchQuery && searchResults.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-gray-600 mb-3">Результаты поиска</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map((user) => (
                      <Card key={user.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback className="bg-yellow-400 text-gray-900 text-lg">{user.display_name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{user.display_name}</h3>
                              <p className="text-sm text-gray-500">@{user.username}</p>
                            </div>
                            <Button size="sm" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900" onClick={() => addContact(user.id)}>
                              <Icon name="UserPlus" size={16} />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contacts.map((contact) => (
                  <Card key={contact.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={contact.avatar_url} />
                          <AvatarFallback className="bg-yellow-400 text-gray-900 text-lg">{contact.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{contact.display_name}</h3>
                          <p className="text-sm text-gray-500">@{contact.username}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="text-gray-600 hover:bg-yellow-50" onClick={() => createChat(contact.id)}>
                          <Icon name="MessageSquare" size={20} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {contacts.length === 0 && !searchQuery && (
                <div className="text-center py-12 text-gray-500">
                  <Icon name="Users" size={64} className="mx-auto mb-4 opacity-20" />
                  <p>Нет контактов</p>
                  <p className="text-sm mt-2">Найдите пользователей через поиск выше</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === 'profile' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Профиль</h1>

              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4">
                      <Avatar className="h-32 w-32">
                        <AvatarImage src={currentUser.avatar_url} />
                        <AvatarFallback className="bg-yellow-400 text-gray-900 text-4xl">{currentUser.display_name[0]}</AvatarFallback>
                      </Avatar>
                      <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 rounded-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 p-3 cursor-pointer">
                        <Icon name="Camera" size={20} />
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadAvatar(file);
                        }}
                      />
                    </div>
                    <Badge className={getRoleBadgeColor(currentUser.role)}>
                      {currentUser.role}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Имя пользователя</Label>
                      <Input
                        placeholder={currentUser.display_name}
                        className="mt-1"
                        onBlur={(e) => {
                          if (e.target.value && e.target.value !== currentUser.display_name) {
                            updateProfile({ display_name: e.target.value });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label>Username</Label>
                      <Input value={`@${currentUser.username}`} disabled className="mt-1 bg-gray-50" />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={currentUser.email} disabled className="mt-1 bg-gray-50" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Настройки</h1>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Уведомления</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Звуковые уведомления</Label>
                        <p className="text-sm text-gray-500">Воспроизводить звук при новом сообщении</p>
                      </div>
                      <Switch />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Push-уведомления</Label>
                        <p className="text-sm text-gray-500">Показывать уведомления на рабочем столе</p>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Приватность</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Показывать статус "в сети"</Label>
                        <p className="text-sm text-gray-500">Другие пользователи увидят когда вы онлайн</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'admin' && (currentUser.role === 'владелец' || currentUser.role === 'администратор') && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Админ-панель</h1>

              <Tabs defaultValue="users">
                <TabsList className="mb-6">
                  <TabsTrigger value="users">Пользователи</TabsTrigger>
                  <TabsTrigger value="roles">Управление ролями</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                  <Card>
                    <CardHeader>
                      <CardTitle>Список пользователей</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {users.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-yellow-400 transition-colors">
                            <div className="flex items-center gap-4">
                              <Avatar>
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="bg-yellow-400 text-gray-900">{user.display_name[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900">{user.display_name}</h3>
                                  <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                                  {user.is_banned && <Badge variant="destructive">Заблокирован</Badge>}
                                </div>
                                <p className="text-sm text-gray-500">@{user.username}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {user.is_banned ? (
                                <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => unbanUser(user.id)}>
                                  <Icon name="Check" size={16} className="mr-1" />
                                  Разбанить
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => banUser(user.id, 'Нарушение правил')}>
                                  <Icon name="Ban" size={16} className="mr-1" />
                                  Забанить
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="roles">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          Владелец
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">Полный доступ ко всем функциям администрирования</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Управление пользователями</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Выдача ролей</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Блокировка пользователей</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          Администратор
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">Расширенные права модерации</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Просмотр пользователей</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Блокировка пользователей</span>
                          </div>
                          <div className="flex items-center gap-2 text-red-600">
                            <Icon name="X" size={16} />
                            <span>Выдача ролей</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                          VIP
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">Премиум функции для пользователей</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Кастомные аватары</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Специальный значок</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                          Пользователь
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">Стандартные функции мессенджера</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Отправка сообщений</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Добавление контактов</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Уведомления</h1>
              <div className="text-center py-12 text-gray-500">
                <Icon name="Bell" size={64} className="mx-auto mb-4 opacity-20" />
                <p>Нет новых уведомлений</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
