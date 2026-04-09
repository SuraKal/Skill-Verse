import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { MOCK_MESSAGES } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { MessageSquare, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [allMessages, setAllMessages] = useState(MOCK_MESSAGES);

  const urlParams = new URLSearchParams(window.location.search);
  const toParam = urlParams.get("to");

  useEffect(() => {
    if (toParam && !selectedChat) setSelectedChat(toParam);
  }, [toParam]);

  const conversations = {};
  allMessages.forEach((msg) => {
    const partner =
      msg.sender_email === user.email ? msg.receiver_email : msg.sender_email;
    const partnerName =
      msg.sender_email === user.email ? msg.receiver_email : msg.sender_name;
    if (!conversations[partner])
      conversations[partner] = {
        email: partner,
        name: partnerName,
        messages: [],
        unread: 0,
      };
    conversations[partner].messages.push(msg);
    if (!msg.read && msg.receiver_email === user.email)
      conversations[partner].unread++;
  });

  const chatMessages = selectedChat
    ? [...(conversations[selectedChat]?.messages || [])].sort(
        (a, b) => new Date(a.created_date) - new Date(b.created_date),
      )
    : [];
  const conversationList = Object.values(conversations);

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;
    const msg = {
      id: `msg-${Date.now()}`,
      sender_email: user.email,
      sender_name: user.full_name,
      receiver_email: selectedChat,
      content: newMessage,
      read: false,
      created_date: new Date().toISOString(),
    };
    setAllMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Messages"
        description="Chat with your skill exchange partners"
      />
      <div className="grid lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        <Card className="lg:col-span-1">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm">Conversations</CardTitle>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-50px)]">
            {conversationList.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No conversations yet
              </div>
            ) : (
              conversationList.map((conv) => (
                <button
                  key={conv.email}
                  onClick={() => setSelectedChat(conv.email)}
                  className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${selectedChat === conv.email ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {conv.name?.[0] || conv.email?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {conv.name || conv.email}
                        </span>
                        {conv.unread > 0 && (
                          <Badge className="bg-primary text-primary-foreground h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                            {conv.unread}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.messages[conv.messages.length - 1]?.content}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          {selectedChat ? (
            <>
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm">
                  {conversations[selectedChat]?.name || selectedChat}
                </CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {chatMessages.map((msg) => {
                    const isMine = msg.sender_email === user.email;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                          >
                            {msg.created_date &&
                              formatDistanceToNow(new Date(msg.created_date), {
                                addSuffix: true,
                              })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="p-3 border-t flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button
                  size="icon"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Choose a conversation to start chatting."
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
