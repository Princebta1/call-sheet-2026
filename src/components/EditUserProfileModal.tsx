import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Edit2 } from "lucide-react";

const editUserProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  statusMessage: z.string().max(100, "Status message must be 100 characters or less").optional(),
});

type EditUserProfileForm = z.infer<typeof editUserProfileSchema>;

interface EditUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    statusMessage?: string | null;
    role: string;
  } | null;
  onUpdate: (userId: number, data: { 
    name: string; 
    email: string; 
    phone?: string;
    statusMessage?: string;
  }) => Promise<void>;
  isPending: boolean;
}

export function EditUserProfileModal({
  isOpen,
  onClose,
  user,
  onUpdate,
  isPending,
}: EditUserProfileModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditUserProfileForm>({
    resolver: zodResolver(editUserProfileSchema),
    values: user ? { 
      name: user.name, 
      email: user.email, 
      phone: user.phone || "",
      statusMessage: user.statusMessage || "",
    } : undefined,
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: EditUserProfileForm) => {
    if (user) {
      await onUpdate(user.id, {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        statusMessage: data.statusMessage || undefined,
      });
      handleClose();
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
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-cinematic-gold-500/20 p-2 rounded-lg">
                          <Edit2 className="h-6 w-6 text-cinematic-gold-400" />
                        </div>
                        <Dialog.Title className="text-xl font-bold text-gray-100">
                          Edit User Profile
                        </Dialog.Title>
                      </div>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                          Full Name
                        </label>
                        <input
                          id="name"
                          type="text"
                          {...register("name")}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                          placeholder="John Doe"
                        />
                        {errors.name && (
                          <p className="mt-2 text-sm text-red-400">{errors.name.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                          Email Address
                        </label>
                        <input
                          id="email"
                          type="email"
                          {...register("email")}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                          placeholder="john@example.com"
                        />
                        {errors.email && (
                          <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                          Phone Number (Optional)
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          {...register("phone")}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div>
                        <label htmlFor="statusMessage" className="block text-sm font-medium text-gray-300 mb-2">
                          Status Message (Optional)
                        </label>
                        <input
                          id="statusMessage"
                          type="text"
                          {...register("statusMessage")}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                          placeholder="What are you working on?"
                          maxLength={100}
                        />
                        {errors.statusMessage && (
                          <p className="mt-2 text-sm text-red-400">{errors.statusMessage.message}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Max 100 characters</p>
                      </div>

                      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">Role</span>
                          <span className="px-3 py-1 bg-cinematic-blue-500/20 text-cinematic-blue-400 rounded-full text-xs font-medium">
                            {user.role}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Use "Change Role" to update the user's role
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-800 p-6 flex gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex-1 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 font-semibold py-3 px-4 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-950"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Edit2 className="h-5 w-5" />
                          Update Profile
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
