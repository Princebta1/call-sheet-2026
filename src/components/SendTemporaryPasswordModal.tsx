import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Key, Copy, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface SendTemporaryPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  onSend: (userId: number) => Promise<{ temporaryPassword: string }>;
  isPending: boolean;
}

export function SendTemporaryPasswordModal({
  isOpen,
  onClose,
  user,
  onSend,
  isPending,
}: SendTemporaryPasswordModalProps) {
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setResetResult(null);
    setCopied(false);
    onClose();
  };

  const handleSend = async () => {
    if (!user) return;
    
    try {
      const result = await onSend(user.id);
      setResetResult({
        email: user.email,
        password: result.temporaryPassword,
      });
    } catch (error) {
      // Error is handled by the parent component
    }
  };

  const copyToClipboard = async () => {
    if (resetResult) {
      await navigator.clipboard.writeText(resetResult.password);
      setCopied(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) return null;

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl">
                {resetResult ? (
                  // Success State
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-500/20 p-2 rounded-lg">
                          <CheckCircle className="h-6 w-6 text-green-400" />
                        </div>
                        <Dialog.Title className="text-xl font-bold text-gray-100">
                          Password Reset!
                        </Dialog.Title>
                      </div>
                      <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-400">
                            <p className="font-medium mb-1">Important: Save this password</p>
                            <p>This temporary password will only be shown once. Share it securely with the user.</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          User Email
                        </label>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-300">
                          {resetResult.email}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Temporary Password
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 font-mono">
                            {resetResult.password}
                          </div>
                          <button
                            onClick={copyToClipboard}
                            className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-gray-700 transition-colors"
                          >
                            {copied ? (
                              <CheckCircle className="h-5 w-5 text-green-400" />
                            ) : (
                              <Copy className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-sm text-blue-400">
                          <strong>Note:</strong> An email has been sent to the user with their new temporary password. They should change it immediately after logging in.
                        </p>
                      </div>

                      <button
                        onClick={handleClose}
                        className="w-full bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  // Confirmation State
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-500/20 p-2 rounded-lg">
                          <Key className="h-6 w-6 text-red-400" />
                        </div>
                        <Dialog.Title className="text-xl font-bold text-gray-100">
                          Send Temporary Password
                        </Dialog.Title>
                      </div>
                      <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-400">
                            <p className="font-medium mb-1">Are you sure?</p>
                            <p>This will reset the password for <strong>{user.name}</strong> and send them a temporary password via email.</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                        <div className="space-y-2 text-sm text-gray-300">
                          <p><strong>User:</strong> {user.name}</p>
                          <p><strong>Email:</strong> {user.email}</p>
                        </div>
                      </div>

                      <div className="text-sm text-gray-400">
                        <p>The user will:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                          <li>Receive an email with their temporary password</li>
                          <li>Be able to log in immediately</li>
                          <li>Be prompted to change their password</li>
                        </ul>
                      </div>
                    </div>

                    <div className="border-t border-gray-800 mt-6 pt-6 flex gap-3">
                      <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={isPending}
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Resetting...
                          </>
                        ) : (
                          <>
                            <Key className="h-5 w-5" />
                            Reset Password
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
