import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Shield, Briefcase, Film, Wrench, FileText, ChevronRight } from "lucide-react";

interface RoleTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  recommendedPermissions: string[];
}

interface RoleTemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  templates: RoleTemplate[];
  categories: string[];
  onSelectTemplate: (template: RoleTemplate) => void;
}

export function RoleTemplateSelector({
  isOpen,
  onClose,
  templates,
  categories,
  onSelectTemplate,
}: RoleTemplateSelectorProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Creative":
        return Film;
      case "Production":
        return Briefcase;
      case "Technical":
        return Wrench;
      case "Administrative":
        return FileText;
      default:
        return Shield;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Creative":
        return "from-purple-500 to-purple-600";
      case "Production":
        return "from-cinematic-blue-500 to-cinematic-blue-600";
      case "Technical":
        return "from-cinematic-emerald-500 to-cinematic-emerald-600";
      case "Administrative":
        return "from-cinematic-gold-500 to-cinematic-gold-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "Creative":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "Production":
        return "bg-cinematic-blue-500/20 text-cinematic-blue-400 border-cinematic-blue-500/30";
      case "Technical":
        return "bg-cinematic-emerald-500/20 text-cinematic-emerald-400 border-cinematic-emerald-500/30";
      case "Administrative":
        return "bg-cinematic-gold-500/20 text-cinematic-gold-400 border-cinematic-gold-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
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
              <Dialog.Panel className="w-full max-w-4xl bg-gray-900 border border-gray-800 rounded-xl shadow-2xl">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-cinematic-gold-500/20 p-2 rounded-lg">
                        <Shield className="h-6 w-6 text-cinematic-gold-400" />
                      </div>
                      <div>
                        <Dialog.Title className="text-xl font-bold text-gray-100">
                          Choose a Role Template
                        </Dialog.Title>
                        <p className="text-sm text-gray-400 mt-1">
                          Start with a pre-configured role for common production positions
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {categories.map((category) => {
                      const categoryTemplates = templates.filter(
                        (t) => t.category === category
                      );
                      const Icon = getCategoryIcon(category);

                      return (
                        <div key={category}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`bg-gradient-to-r ${getCategoryColor(category)} p-1.5 rounded-lg`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-200">
                              {category}
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {categoryTemplates.map((template) => (
                              <button
                                key={template.id}
                                onClick={() => {
                                  onSelectTemplate(template);
                                  onClose();
                                }}
                                className="group text-left p-4 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-cinematic-gold-500/50 hover:bg-gray-800 transition-all"
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-base font-semibold text-gray-100 group-hover:text-cinematic-gold-400 transition-colors">
                                      {template.name}
                                    </h4>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border ${getCategoryBadgeColor(category)} mt-1`}>
                                      {template.category}
                                    </span>
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-cinematic-gold-400 transition-colors flex-shrink-0" />
                                </div>
                                <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                                  {template.description}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Shield className="h-3 w-3" />
                                  <span>
                                    {template.recommendedPermissions.length} permissions
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <Shield className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-300">
                        <p className="font-medium mb-1">About Role Templates</p>
                        <p className="text-blue-300/80">
                          Templates provide a starting point with recommended permissions for common production roles. 
                          You can customize the permissions after selecting a template.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
