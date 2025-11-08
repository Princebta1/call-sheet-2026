import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useMessageNotificationStore } from "~/stores/messageNotificationStore";
import { useMessagesLayoutStore } from "~/stores/messagesLayoutStore";
import { ProtectedRoute } from "~/components/ProtectedRoute";
import { PresenceIndicator } from "~/components/PresenceIndicator";
import { usePermissions } from "~/hooks/usePermissions";
import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Image, Loader2, X, Users, Hash, Check, CheckCheck, PanelLeftClose, PanelLeft, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/shows/$showId/messages/")({
  component: ShowMessagesPage,
});

function ShowMessagesPage() {
  return (
    <ProtectedRoute requiredPermission="view_messages">
      <ShowMessagesPageContent />
    </ProtectedRoute>
  );
}

interface Attachment {
  url: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
}

function ShowMessagesPageContent() {
  const { showId } = useParams({ from: "/shows/$showId/messages/" });
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const { markMessagesViewed } = useMessageNotificationStore();
  const { isFullScreen, setFullScreen, toggleFullScreen } = useMessagesLayoutStore();
  const permissions = usePermissions();
  const [messageContent, setMessageContent] = useState("");
  const [uploadingImages, setUploadingImages] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [showUserList, setShowUserList] = useState(false);
  const [observedMessages, setObservedMessages] = useState<Set<number>>(new Set());
  const [streamedMessages, setStreamedMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: number; userName: string }>>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Set full-screen mode when component mounts, clear when unmounts
  useEffect(() => {
    setFullScreen(true);
    return () => {
      setFullScreen(false);
    };
  }, [setFullScreen]);

  // Fetch show details
  const showsQuery = useQuery(
    trpc.getShows.queryOptions({ token: token || "" })
  );
  const show = showsQuery.data?.find((s) => s.id === parseInt(showId));

  // Fetch users in this show for private messaging
  const usersQuery = useQuery(
    trpc.getCompanyUsers.queryOptions({
      token: token || "",
      showId: showId,
    })
  );

  const availableUsers = (usersQuery.data?.users || []).filter(
    (u) => u.id !== user?.id && u.isActive && u.approvedByAdmin
  );

  // Fetch initial/historical messages (no polling - subscription handles real-time updates)
  const messagesQuery = useQuery(
    trpc.getMessages.queryOptions({
      token: token || "",
      showId: parseInt(showId),
      recipientId: selectedRecipientId || undefined,
    })
  );

  // Subscribe to real-time message updates
  const messageSubscription = useSubscription(
    trpc.messageStream.subscriptionOptions(
      {
        token: token || "",
        showId: parseInt(showId),
        recipientId: selectedRecipientId || undefined,
      },
      {
        enabled: !!token && !!showId,
        onStarted: () => {
          console.log("Message stream started");
        },
        onData: (newMessage) => {
          // Append new message to streamed messages
          setStreamedMessages((prev) => {
            // Avoid duplicates by checking if message already exists
            if (prev.some((msg) => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          
          // Scroll to bottom when new message arrives
          setTimeout(() => scrollToBottom(), 100);
        },
        onError: (error) => {
          console.error("Message stream error:", error);
          toast.error("Connection error. Reconnecting...");
        },
      }
    )
  );

  // Subscribe to typing status updates
  const typingSubscription = useSubscription(
    trpc.typingStatusStream.subscriptionOptions(
      {
        token: token || "",
        showId: parseInt(showId),
        recipientId: selectedRecipientId || undefined,
      },
      {
        enabled: !!token && !!showId,
        onData: (data) => {
          setTypingUsers(data.typingUsers);
        },
        onError: (error) => {
          console.error("Typing status stream error:", error);
        },
      }
    )
  );

  // Combine initial messages with streamed messages
  const initialMessages = messagesQuery.data?.messages || [];
  const allMessageIds = new Set([
    ...initialMessages.map((m) => m.id),
    ...streamedMessages.map((m) => m.id),
  ]);
  
  // Merge and deduplicate messages, maintaining chronological order
  const messages = [
    ...initialMessages,
    ...streamedMessages.filter((m) => !initialMessages.some((im) => im.id === m.id)),
  ].sort((a, b) => a.id - b.id);

  // Create message mutation
  const createMessageMutation = useMutation(
    trpc.createMessage.mutationOptions({
      onSuccess: () => {
        setMessageContent("");
        setAttachments([]);
        // No need to invalidate queries - subscription will pick up the new message
        scrollToBottom();
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to send message");
      },
    })
  );

  // Generate upload URL mutation
  const generateUploadUrlMutation = useMutation(
    trpc.generateMessageImageUploadUrl.mutationOptions()
  );

  // Mark message as read mutation
  const markMessageAsReadMutation = useMutation(
    trpc.markMessageAsRead.mutationOptions({
      onSuccess: () => {
        // Invalidate messages query to refresh read status
        queryClient.invalidateQueries({ 
          queryKey: trpc.getMessages.queryKey({
            token: token || "",
            showId: parseInt(showId),
            recipientId: selectedRecipientId || undefined,
          })
        });
      },
    })
  );

  // Send typing status mutation
  const sendTypingStatusMutation = useMutation(
    trpc.sendTypingStatus.mutationOptions()
  );

  // Update user presence while on messages page (every 30 seconds for more responsive presence)
  const updatePresenceMutation = useMutation(
    trpc.updateUserPresence.mutationOptions()
  );

  useEffect(() => {
    if (!token) return;

    // Update presence immediately
    updatePresenceMutation.mutate({ token });

    // Then update every 30 seconds while on this page
    const interval = setInterval(() => {
      updatePresenceMutation.mutate({ token });
    }, 30 * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Only depend on token, mutation is stable

  // Reset streamed messages when recipient changes
  useEffect(() => {
    setStreamedMessages([]);
  }, [selectedRecipientId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as viewed when component mounts and when messages change
  useEffect(() => {
    markMessagesViewed(parseInt(showId));
  }, [showId, markMessagesViewed]);

  // Also mark as viewed when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesViewed(parseInt(showId));
    }
  }, [messages.length, showId, markMessagesViewed]);

  // Set up Intersection Observer to mark messages as read when they become visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = parseInt(entry.target.getAttribute("data-message-id") || "0");
            const senderId = parseInt(entry.target.getAttribute("data-sender-id") || "0");
            
            // Only mark as read if:
            // 1. We haven't already observed this message
            // 2. The message is not from the current user
            // 3. We have a valid message ID
            if (
              messageId &&
              senderId !== user?.id &&
              !observedMessages.has(messageId)
            ) {
              setObservedMessages((prev) => new Set(prev).add(messageId));
              
              // Mark the message as read
              markMessageAsReadMutation.mutate({
                token: token || "",
                messageId: messageId,
              });
            }
          }
        });
      },
      {
        threshold: 0.5, // Message needs to be 50% visible
        rootMargin: "0px",
      }
    );

    // Observe all message elements
    messageRefs.current.forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [messages, user?.id, token, observedMessages]);

  // Clean up typing status on unmount or when changing conversations
  useEffect(() => {
    return () => {
      handleTypingStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecipientId, showId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTypingStart = () => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing status
    sendTypingStatusMutation.mutate({
      token: token || "",
      showId: parseInt(showId),
      recipientId: selectedRecipientId || undefined,
      isTyping: true,
    });

    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatusMutation.mutate({
        token: token || "",
        showId: parseInt(showId),
        recipientId: selectedRecipientId || undefined,
        isTyping: false,
      });
    }, 3000);
  };

  const handleTypingStop = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendTypingStatusMutation.mutate({
      token: token || "",
      showId: parseInt(showId),
      recipientId: selectedRecipientId || undefined,
      isTyping: false,
    });
  };

  const selectedRecipient = selectedRecipientId
    ? availableUsers.find((u) => u.id === selectedRecipientId)
    : null;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(files);

    try {
      const uploadedAttachments: Attachment[] = [];

      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }

        // Get file extension
        const extension = "." + file.name.split(".").pop()?.toLowerCase();
        if (![".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(extension)) {
          toast.error(`${file.name} has an unsupported format`);
          continue;
        }

        // Generate upload URL
        const uploadData = await generateUploadUrlMutation.mutateAsync({
          token: token || "",
          fileExtension: extension,
          fileName: file.name,
        });

        // Upload file to MinIO
        const uploadResponse = await fetch(uploadData.presignedUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        uploadedAttachments.push({
          url: uploadData.publicUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        });
      }

      setAttachments((prev) => [...prev, ...uploadedAttachments]);
      toast.success(`${uploadedAttachments.length} image(s) uploaded`);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload images");
    } finally {
      setUploadingImages([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() && attachments.length === 0) {
      return;
    }

    createMessageMutation.mutate({
      token: token || "",
      showId: parseInt(showId),
      recipientId: selectedRecipientId || undefined,
      content: messageContent.trim() || "(Image)",
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-950 z-10">
      {/* Navigation Controls - Fixed position in top-left */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        {/* Back Button */}
        <button
          onClick={() => navigate({ to: `/shows/${showId}/scenes` })}
          className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors shadow-lg"
          title="Back to production"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleFullScreen}
          className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors shadow-lg"
          title={isFullScreen ? "Show navigation" : "Hide navigation"}
        >
          {isFullScreen ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="ml-32">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-cinematic-blue-500/20 rounded-lg">
                  {selectedRecipient ? (
                    <MessageSquare className="h-5 w-5 text-cinematic-blue-400" />
                  ) : (
                    <Hash className="h-5 w-5 text-cinematic-blue-400" />
                  )}
                </div>
                <h1 className="text-2xl font-bold text-white">
                  {selectedRecipient ? selectedRecipient.name : "Show Channel"}
                </h1>
              </div>
              <p className="text-gray-400 text-sm">
                {selectedRecipient
                  ? `Private conversation • ${selectedRecipient.role}`
                  : `Production chat for ${show?.title || "this production"}`}
              </p>
            </div>
            
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <Users className="h-5 w-5" />
              <span>Conversations</span>
            </button>
          </div>
        </div>

        {/* User/Channel Selector */}
        {showUserList && (
          <div className="border-t border-gray-800 px-6 py-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Show Channel Option */}
              <button
                onClick={() => {
                  setSelectedRecipientId(null);
                  setShowUserList(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  selectedRecipientId === null
                    ? "bg-cinematic-blue-500/20 border border-cinematic-blue-500"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                <div className="p-2 bg-cinematic-blue-500/20 rounded-lg">
                  <Hash className="h-5 w-5 text-cinematic-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-white">Show Channel</div>
                  <div className="text-sm text-gray-400">
                    Public conversation for all team members
                  </div>
                </div>
              </button>

              {/* Private Conversation Options */}
              {availableUsers.length > 0 && (
                <>
                  <div className="pt-2 pb-1 px-2 text-xs font-semibold text-gray-500 uppercase">
                    Team Members
                  </div>
                  {availableUsers.map((teamUser) => (
                    <button
                      key={teamUser.id}
                      onClick={() => {
                        setSelectedRecipientId(teamUser.id);
                        setShowUserList(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        selectedRecipientId === teamUser.id
                          ? "bg-cinematic-blue-500/20 border border-cinematic-blue-500"
                          : "bg-gray-800 hover:bg-gray-700"
                      }`}
                    >
                      <div className="relative">
                        {teamUser.profileImage ? (
                          <img
                            src={teamUser.profileImage}
                            alt={teamUser.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-cinematic-blue-500 to-cinematic-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                              {teamUser.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 bg-gray-800 rounded-full p-0.5">
                          <PresenceIndicator
                            lastActiveAt={teamUser.lastActiveAt}
                            size="sm"
                            statusMessage={teamUser.statusMessage}
                          />
                        </div>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-white">
                          {teamUser.name}
                        </div>
                        <div className="text-sm text-gray-400">
                          {teamUser.role}
                        </div>
                        {teamUser.statusMessage && (
                          <div className="text-xs text-gray-500 italic truncate">
                            "{teamUser.statusMessage}"
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              )}

              {availableUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No other team members available
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messagesQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cinematic-blue-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
              {selectedRecipient ? (
                <MessageSquare className="h-8 w-8 text-gray-600" />
              ) : (
                <Hash className="h-8 w-8 text-gray-600" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No messages yet
            </h3>
            <p className="text-gray-400 mb-6">
              {selectedRecipient
                ? `Start a private conversation with ${selectedRecipient.name}`
                : "Start the conversation by sending the first message"}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender.id === user?.id;
            
            return (
              <div
                key={message.id}
                ref={(el) => {
                  if (el) {
                    messageRefs.current.set(message.id, el);
                  } else {
                    messageRefs.current.delete(message.id);
                  }
                }}
                data-message-id={message.id}
                data-sender-id={message.sender.id}
                className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar with presence indicator */}
                {!isOwnMessage && (
                  <div className="flex-shrink-0 relative">
                    {message.sender.profileImage ? (
                      <img
                        src={message.sender.profileImage}
                        alt={message.sender.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-cinematic-blue-500 to-cinematic-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {message.sender.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 bg-gray-950 rounded-full p-0.5">
                      <PresenceIndicator
                        lastActiveAt={message.sender.lastActiveAt}
                        size="sm"
                        statusMessage={message.sender.statusMessage}
                      />
                    </div>
                  </div>
                )}

                {/* Message Content */}
                <div className={`flex-1 max-w-2xl ${isOwnMessage ? "text-right" : ""}`}>
                  {!isOwnMessage && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">
                        {message.sender.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.sender.role}
                      </span>
                      {message.recipient && !selectedRecipientId && (
                        <span className="text-xs text-cinematic-blue-400 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Private
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div
                    className={`inline-block rounded-2xl px-4 py-2.5 ${
                      isOwnMessage
                        ? "bg-cinematic-blue-500 text-white"
                        : "bg-gray-800 text-gray-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={attachment.url}
                              alt={attachment.fileName}
                              className="rounded-lg max-w-sm max-h-64 object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className={`flex items-center gap-1 text-xs text-gray-500 mt-1 ${isOwnMessage ? "justify-end" : ""}`}>
                    <span>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    
                    {/* Read indicators for own messages */}
                    {isOwnMessage && (
                      <>
                        {message.readBy && message.readBy.length > 0 ? (
                          <div
                            className="flex items-center gap-0.5 text-cinematic-blue-400"
                            title={
                              message.recipient
                                ? `Seen by ${message.readBy[0]?.userName} at ${new Date(message.readBy[0]?.readAt).toLocaleString()}`
                                : `Seen by ${message.readBy.length} ${message.readBy.length === 1 ? "person" : "people"}`
                            }
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5 text-gray-500">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10" /> {/* Spacer for alignment */}
            <div className="flex-1 max-w-2xl">
              <div className="inline-block rounded-2xl px-4 py-2.5 bg-gray-800 text-gray-400 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>
                    {typingUsers.length === 1
                      ? `${typingUsers[0].userName} is typing...`
                      : typingUsers.length === 2
                      ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`
                      : `${typingUsers.length} people are typing...`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {permissions.canSendMessages() && (
        <div className="border-t border-gray-800 bg-gray-900 px-6 py-4">
          {/* Attachment Preview */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="relative group bg-gray-800 rounded-lg p-2"
                >
                  <img
                    src={attachment.url}
                    alt={attachment.fileName}
                    className="h-20 w-20 object-cover rounded"
                  />
                  <button
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Uploading Preview */}
          {uploadingImages.length > 0 && (
            <div className="mb-3 flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading {uploadingImages.length} image(s)...</span>
            </div>
          )}

          <div className="flex items-end gap-3">
            {/* Image Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImages.length > 0}
              className="p-3 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image className="h-5 w-5" />
            </button>

            {/* Message Input */}
            <div className="flex-1">
              <textarea
                value={messageContent}
                onChange={(e) => {
                  setMessageContent(e.target.value);
                  if (e.target.value.trim()) {
                    handleTypingStart();
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                rows={1}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cinematic-blue-500 resize-none"
                style={{ minHeight: "48px", maxHeight: "120px" }}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={
                createMessageMutation.isPending ||
                (!messageContent.trim() && attachments.length === 0)
              }
              className="p-3 bg-cinematic-blue-500 text-white rounded-lg hover:bg-cinematic-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMessageMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
