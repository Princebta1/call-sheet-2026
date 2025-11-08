import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Building2, UserPlus } from "lucide-react";

const createCompanySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyEmail: z.string().email("Invalid email address"),
  subscriptionTier: z.enum(["Basic", "Pro", "Enterprise"]).default("Basic"),
  adminName: z.string().min(1, "Admin name is required"),
  adminEmail: z.string().email("Invalid admin email address"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
  adminPhone: z.string().optional(),
});

type CreateCompanyForm = z.infer<typeof createCompanySchema>;

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCompany: (data: {
    companyName: string;
    companyEmail: string;
    subscriptionTier: "Basic" | "Pro" | "Enterprise";
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    adminPhone?: string;
  }) => Promise<void>;
  isPending: boolean;
}

export function CreateCompanyModal({
  isOpen,
  onClose,
  onCreateCompany,
  isPending,
}: CreateCompanyModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateCompanyForm>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      subscriptionTier: "Basic",
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: CreateCompanyForm) => {
    try {
      await onCreateCompany(data);
      reset();
    } catch (error) {
      // Error is handled by the parent component
    }
  };

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
              <Dialog.Panel className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-xl shadow-2xl">
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-cinematic-gold-500/20 p-2 rounded-lg">
                          <Building2 className="h-6 w-6 text-cinematic-gold-400" />
                        </div>
                        <Dialog.Title className="text-xl font-bold text-gray-100">
                          Create New Company
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

                    <div className="space-y-6">
                      {/* Company Information Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-cinematic-gold-400" />
                          Company Information
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">
                              Company Name
                            </label>
                            <input
                              id="companyName"
                              type="text"
                              {...register("companyName")}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                              placeholder="Acme Productions"
                            />
                            {errors.companyName && (
                              <p className="mt-2 text-sm text-red-400">{errors.companyName.message}</p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-300 mb-2">
                              Company Email
                            </label>
                            <input
                              id="companyEmail"
                              type="email"
                              {...register("companyEmail")}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                              placeholder="info@acmeproductions.com"
                            />
                            {errors.companyEmail && (
                              <p className="mt-2 text-sm text-red-400">{errors.companyEmail.message}</p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="subscriptionTier" className="block text-sm font-medium text-gray-300 mb-2">
                              Subscription Tier
                            </label>
                            <select
                              id="subscriptionTier"
                              {...register("subscriptionTier")}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                            >
                              <option value="Basic">Basic</option>
                              <option value="Pro">Pro</option>
                              <option value="Enterprise">Enterprise</option>
                            </select>
                            {errors.subscriptionTier && (
                              <p className="mt-2 text-sm text-red-400">{errors.subscriptionTier.message}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Admin Information Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                          <UserPlus className="h-5 w-5 text-cinematic-gold-400" />
                          Production Admin
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="adminName" className="block text-sm font-medium text-gray-300 mb-2">
                              Full Name
                            </label>
                            <input
                              id="adminName"
                              type="text"
                              {...register("adminName")}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                              placeholder="John Doe"
                            />
                            {errors.adminName && (
                              <p className="mt-2 text-sm text-red-400">{errors.adminName.message}</p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-300 mb-2">
                              Email Address
                            </label>
                            <input
                              id="adminEmail"
                              type="email"
                              {...register("adminEmail")}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                              placeholder="john@acmeproductions.com"
                            />
                            {errors.adminEmail && (
                              <p className="mt-2 text-sm text-red-400">{errors.adminEmail.message}</p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-300 mb-2">
                              Password
                            </label>
                            <input
                              id="adminPassword"
                              type="password"
                              {...register("adminPassword")}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                              placeholder="••••••••"
                            />
                            {errors.adminPassword && (
                              <p className="mt-2 text-sm text-red-400">{errors.adminPassword.message}</p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="adminPhone" className="block text-sm font-medium text-gray-300 mb-2">
                              Phone Number (Optional)
                            </label>
                            <input
                              id="adminPhone"
                              type="tel"
                              {...register("adminPhone")}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                              placeholder="+1 (555) 123-4567"
                            />
                          </div>
                        </div>
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
                          Creating...
                        </>
                      ) : (
                        <>
                          <Building2 className="h-5 w-5" />
                          Create Company
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
