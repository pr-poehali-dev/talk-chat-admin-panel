import { useState } from 'react';
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

type UserRole = 'владелец' | 'администратор' | 'VIP' | 'пользователь';

const Index = () => {
  const [activeSection, setActiveSection] = useState<'chats' | 'contacts' | 'profile' | 'settings' | 'admin' | 'notifications'>('chats');

  const mockChats = [
    { id: 1, username: '@debvlel', name: 'Дмитрий', lastMessage: 'Привет, как дела?', time: '14:30', unread: 2, avatar: '' },
    { id: 2, username: '@anna_k', name: 'Анна', lastMessage: 'Спасибо за помощь!', time: '12:15', unread: 0, avatar: '' },
    { id: 3, username: '@maxpro', name: 'Максим', lastMessage: 'Увидимся завтра', time: 'Вчера', unread: 0, avatar: '' },
  ];

  const mockContacts = [
    { id: 1, username: '@debvlel', name: 'Дмитрий', online: true, avatar: '' },
    { id: 2, username: '@anna_k', name: 'Анна', online: false, avatar: '' },
    { id: 3, username: '@maxpro', name: 'Максим', online: true, avatar: '' },
    { id: 4, username: '@kate_m', name: 'Екатерина', online: false, avatar: '' },
  ];

  const mockUsers = [
    { id: 1, username: '@debvlel', name: 'Дмитрий', role: 'владелец' as UserRole, banned: false },
    { id: 2, username: '@anna_k', name: 'Анна', role: 'VIP' as UserRole, banned: false },
    { id: 3, username: '@maxpro', name: 'Максим', role: 'администратор' as UserRole, banned: false },
    { id: 4, username: '@kate_m', name: 'Екатерина', role: 'пользователь' as UserRole, banned: false },
    { id: 5, username: '@spammer', name: 'Спамер', role: 'пользователь' as UserRole, banned: true },
  ];

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'владелец': return 'bg-yellow-500 hover:bg-yellow-600 text-gray-900';
      case 'администратор': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'VIP': return 'bg-purple-500 hover:bg-purple-600 text-white';
      case 'пользователь': return 'bg-gray-400 hover:bg-gray-500 text-white';
    }
  };

  return (
    <div className="flex h-screen bg-white">
      <aside className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 space-y-8">
        <div className="text-2xl font-bold text-yellow-500">TC</div>
        
        <nav className="flex flex-col space-y-6">
          <button
            onClick={() => setActiveSection('chats')}
            className={`p-3 rounded-xl transition-all ${
              activeSection === 'chats' ? 'bg-yellow-400 text-gray-900' : 'text-gray-600 hover:bg-yellow-50'
            }`}
          >
            <Icon name="MessageSquare" size={24} />
          </button>
          
          <button
            onClick={() => setActiveSection('contacts')}
            className={`p-3 rounded-xl transition-all ${
              activeSection === 'contacts' ? 'bg-yellow-400 text-gray-900' : 'text-gray-600 hover:bg-yellow-50'
            }`}
          >
            <Icon name="Users" size={24} />
          </button>
          
          <button
            onClick={() => setActiveSection('profile')}
            className={`p-3 rounded-xl transition-all ${
              activeSection === 'profile' ? 'bg-yellow-400 text-gray-900' : 'text-gray-600 hover:bg-yellow-50'
            }`}
          >
            <Icon name="User" size={24} />
          </button>
          
          <button
            onClick={() => setActiveSection('settings')}
            className={`p-3 rounded-xl transition-all ${
              activeSection === 'settings' ? 'bg-yellow-400 text-gray-900' : 'text-gray-600 hover:bg-yellow-50'
            }`}
          >
            <Icon name="Settings" size={24} />
          </button>
          
          <button
            onClick={() => setActiveSection('admin')}
            className={`p-3 rounded-xl transition-all ${
              activeSection === 'admin' ? 'bg-yellow-400 text-gray-900' : 'text-gray-600 hover:bg-yellow-50'
            }`}
          >
            <Icon name="Shield" size={24} />
          </button>
          
          <button
            onClick={() => setActiveSection('notifications')}
            className={`p-3 rounded-xl transition-all relative ${
              activeSection === 'notifications' ? 'bg-yellow-400 text-gray-900' : 'text-gray-600 hover:bg-yellow-50'
            }`}
          >
            <Icon name="Bell" size={24} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeSection === 'chats' && (
          <div className="flex flex-1 overflow-hidden">
            <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Чаты</h1>
                  <Button size="icon" variant="ghost" className="text-gray-600 hover:bg-yellow-50">
                    <Icon name="Plus" size={20} />
                  </Button>
                </div>
                <div className="relative">
                  <Icon name="Search" size={20} className="absolute left-3 top-3 text-gray-400" />
                  <Input placeholder="Поиск..." className="pl-10 bg-gray-50 border-gray-200" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {mockChats.map((chat) => (
                  <div
                    key={chat.id}
                    className="px-6 py-4 hover:bg-yellow-50 cursor-pointer transition-colors border-b border-gray-100"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={chat.avatar} />
                        <AvatarFallback className="bg-yellow-400 text-gray-900">{chat.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-900">{chat.name}</span>
                          <span className="text-xs text-gray-500">{chat.time}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                          {chat.unread > 0 && (
                            <Badge className="bg-yellow-400 text-gray-900 hover:bg-yellow-500 ml-2">
                              {chat.unread}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">{chat.username}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-gray-50">
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-yellow-400 text-gray-900">Д</AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold text-gray-900">Дмитрий</h2>
                      <p className="text-sm text-gray-500">@debvlel</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" className="text-gray-600 hover:bg-yellow-50">
                      <Icon name="Phone" size={20} />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-gray-600 hover:bg-yellow-50">
                      <Icon name="Video" size={20} />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-gray-600 hover:bg-yellow-50">
                      <Icon name="MoreVertical" size={20} />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs shadow-sm">
                    <p className="text-gray-900">Привет! Как дела?</p>
                    <span className="text-xs text-gray-400 mt-1 block">14:28</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-yellow-400 rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs shadow-sm">
                    <p className="text-gray-900">Отлично! А у тебя?</p>
                    <span className="text-xs text-gray-700 mt-1 block">14:30</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border-t border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Button size="icon" variant="ghost" className="text-gray-600 hover:bg-yellow-50">
                    <Icon name="Paperclip" size={20} />
                  </Button>
                  <Input placeholder="Введите сообщение..." className="flex-1 bg-gray-50 border-gray-200" />
                  <Button className="bg-yellow-400 hover:bg-yellow-500 text-gray-900">
                    <Icon name="Send" size={20} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'contacts' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Контакты</h1>
                <Button className="bg-yellow-400 hover:bg-yellow-500 text-gray-900">
                  <Icon name="UserPlus" size={20} className="mr-2" />
                  Добавить контакт
                </Button>
              </div>

              <div className="relative mb-6">
                <Icon name="Search" size={20} className="absolute left-3 top-3 text-gray-400" />
                <Input placeholder="Найти контакт..." className="pl-10 bg-white border-gray-200" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockContacts.map((contact) => (
                  <Card key={contact.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={contact.avatar} />
                            <AvatarFallback className="bg-yellow-400 text-gray-900 text-lg">
                              {contact.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          {contact.online && (
                            <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                          <p className="text-sm text-gray-500">{contact.username}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {contact.online ? 'В сети' : 'Не в сети'}
                          </p>
                        </div>
                        <Button size="icon" variant="ghost" className="text-gray-600 hover:bg-yellow-50">
                          <Icon name="MessageSquare" size={20} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
                        <AvatarFallback className="bg-yellow-400 text-gray-900 text-4xl">Д</AvatarFallback>
                      </Avatar>
                      <Button
                        size="icon"
                        className="absolute bottom-0 right-0 rounded-full bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                      >
                        <Icon name="Camera" size={20} />
                      </Button>
                    </div>
                    <Badge className="bg-yellow-500 text-gray-900 hover:bg-yellow-600 mb-2">
                      Владелец
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Имя пользователя</Label>
                      <Input id="name" placeholder="Дмитрий" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" placeholder="@debvlel" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="example@mail.com" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="password">Пароль</Label>
                      <Input id="password" type="password" placeholder="••••••••" className="mt-1" />
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900">
                    Сохранить изменения
                  </Button>
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
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Время последнего входа</Label>
                        <p className="text-sm text-gray-500">Показывать когда вы были в сети</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Внешний вид</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Тёмная тема</Label>
                        <p className="text-sm text-gray-500">Использовать темное оформление</p>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'admin' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Админ-панель</h1>

              <Tabs defaultValue="users" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="users">Пользователи</TabsTrigger>
                  <TabsTrigger value="roles">Управление ролями</TabsTrigger>
                  <TabsTrigger value="bans">Наказания</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Список пользователей</CardTitle>
                        <div className="relative w-64">
                          <Icon name="Search" size={20} className="absolute left-3 top-3 text-gray-400" />
                          <Input placeholder="Поиск пользователя..." className="pl-10" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mockUsers.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-yellow-400 transition-colors">
                            <div className="flex items-center gap-4">
                              <Avatar>
                                <AvatarFallback className="bg-yellow-400 text-gray-900">
                                  {user.name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900">{user.name}</h3>
                                  <Badge className={getRoleBadgeColor(user.role)}>
                                    {user.role}
                                  </Badge>
                                  {user.banned && (
                                    <Badge variant="destructive">Заблокирован</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">{user.username}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Icon name="Edit" size={16} className="mr-1" />
                                Изменить
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                                <Icon name="Ban" size={16} className="mr-1" />
                                Забанить
                              </Button>
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
                        <p className="text-sm text-gray-600 mb-4">
                          Полный доступ ко всем функциям администрирования
                        </p>
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
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Доступ к настройкам</span>
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
                        <p className="text-sm text-gray-600 mb-4">
                          Расширенные права модерации
                        </p>
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
                        <p className="text-sm text-gray-600 mb-4">
                          Премиум функции для пользователей
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Кастомные аватары</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Приоритетная поддержка</span>
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
                        <p className="text-sm text-gray-600 mb-4">
                          Стандартные функции мессенджера
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Отправка сообщений</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Добавление контактов</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-600">
                            <Icon name="Check" size={16} />
                            <span>Создание чатов</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="bans">
                  <Card>
                    <CardHeader>
                      <CardTitle>Управление наказаниями</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-gray-400 text-white">С</AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold text-gray-900">Спамер</h3>
                                <p className="text-sm text-gray-600">@spammer</p>
                              </div>
                            </div>
                            <Badge variant="destructive">Заблокирован</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">Причина: Массовая рассылка спама</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50">
                              <Icon name="Check" size={16} className="mr-1" />
                              Разблокировать
                            </Button>
                            <Button size="sm" variant="outline">
                              <Icon name="Eye" size={16} className="mr-1" />
                              Подробнее
                            </Button>
                          </div>
                        </div>

                        <div className="p-6 border-2 border-dashed border-gray-200 rounded-lg text-center">
                          <Icon name="ShieldAlert" size={48} className="mx-auto text-gray-400 mb-3" />
                          <p className="text-gray-600 mb-4">Нет других активных наказаний</p>
                          <Button variant="outline">
                            <Icon name="Plus" size={16} className="mr-2" />
                            Добавить наказание
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Уведомления</h1>

              <div className="space-y-4">
                <Card className="border-l-4 border-l-yellow-400">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Icon name="MessageSquare" size={20} className="text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Новое сообщение от Дмитрий</h3>
                        <p className="text-sm text-gray-600 mt-1">Привет, как дела?</p>
                        <p className="text-xs text-gray-400 mt-2">2 минуты назад</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Icon name="UserPlus" size={20} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Новый контакт</h3>
                        <p className="text-sm text-gray-600 mt-1">Анна добавила вас в контакты</p>
                        <p className="text-xs text-gray-400 mt-2">1 час назад</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Icon name="Star" size={20} className="text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">VIP статус активирован</h3>
                        <p className="text-sm text-gray-600 mt-1">Вы получили VIP статус на 30 дней</p>
                        <p className="text-xs text-gray-400 mt-2">Вчера</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
