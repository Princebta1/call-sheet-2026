import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Film, Calendar, FileText, Building2, Upload, Image } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";
import { ProductionHouseCombobox } from "~/components/ProductionHouseCombobox";

interface EditShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  show: {
    id: number;
    title: string;
    productionHouseId?: number | null;
    thumbnailURL?: string | null;
    description?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    status: string;
  } | null;
  productionHouses: Array<{
    id: number;
    name: string;
  }>;
  onUpdate: (showId: number, data: ShowFormData) => Promise<void>;
  isPending: boolean;
  onCreateProductionHouse?: (name: string) => Promise<void>;
  isCreatingProductionHouse?: boolean;
}

const showFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  productionHouseId: z.number({
    required_error: "Production house is required",
    invalid_type_error: "Production house is required",
  }),
  thumbnailURL: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["Pre-Production", "Shooting", "Wrapped"]),
});

type ShowFormData = z.infer<typeof showFormSchema>;

export function EditShowModal({
  isOpen,
  onClose,
  show,
  productionHouses,
  onUpdate,
  isPending,
  onCreateProductionHouse,
  isCreatingProductionHouse = false,
}: EditShowModalProps) {
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const generateUploadUrlMutation = useMutation(
    trpc.generateShowThumbnailUploadUrl.mutationOptions()
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ShowFormData>({
    resolver: zodResolver(showFormSchema),
  });

  const currentThumbnailURL = watch("thumbnailURL");

  // Reset form when show changes
  useEffect(() => {
    if (show) {
      const formatDateForInput = (date: Date | string | null | undefined) => {
        if (!date) return "";
        const d = new Date(date);
        return d.toISOString().split("T")[0];
      };

      reset({
        title: show.title,
        productionHouseId: show.productionHouseId || undefined,
        thumbnailURL: show.thumbnailURL || "",
        description: show.description || "",
        startDate: formatDateForInput(show.startDate),
        endDate: formatDateForInput(show.endDate),
        status: show.status as "Pre-Production" | "Shooting" | "Wrapped",
      });
      setThumbnailPreview(null);
    }
  }, [show, reset]);

  const handleThumbnailChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !show) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    try {
      setIsUploadingThumbnail(true);

      // Get file extension
      const extension = file.name.split(".").pop() || "jpg";

      // Generate upload URL
      const { uploadUrl, publicUrl } = await generateUploadUrlMutation.mutateAsync({
        token: token || "",
        showId: show.id,
        fileExtension: extension,
      });

      // Upload file to MinIO
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload thumbnail");
      }

      // Update form with new thumbnail URL
      setValue("thumbnailURL", publicUrl);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      toast.success("Thumbnail uploaded successfully!");
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      toast.error("Failed to upload thumbnail");
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleRemoveThumbnail = () => {
    setValue("thumbnailURL", "");
    setThumbnailPreview(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: ShowFormData) => {
    if (show) {
      await onUpdate(show.id, data);
      handleClose();
    }
  };

  if (!show) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/95 border border-gray-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-cinematic-gold-500/20 rounded-lg">
                      <Film className="h-6 w-6 text-cinematic-gold-400" />
                    </div>
                    Edit Production
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label
                      htmlFor="title"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Title *
                    </label>
                    <input
                      id="title"
                      type="text"
                      {...register("title")}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                      placeholder="Production title"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-400">
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Thumbnail
                    </label>
                    
                    <div className="flex items-start gap-4">
                      {/* Preview */}
                      <div className="flex-shrink-0">
                        {thumbnailPreview || currentThumbnailURL ? (
                          <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-gray-700">
                            <img
                              src={thumbnailPreview || currentThumbnailURL || ""}
                              alt="Thumbnail preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveThumbnail}
                              className="absolute top-1 right-1 p-1 bg-red-500/90 hover:bg-red-600 rounded-full text-white transition-colors"
                              title="Remove thumbnail"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center bg-gray-800/50">
                            <Image className="h-8 w-8 text-gray-600" />
                          </div>
                        )}
                      </div>

                      {/* Upload button */}
                      <div className="flex-1">
                        <label
                          htmlFor="thumbnail-upload"
                          className={`inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-all cursor-pointer font-medium ${
                            isUploadingThumbnail ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <Upload className="h-4 w-4" />
                          {isUploadingThumbnail ? "Uploading..." : "Upload Thumbnail"}
                        </label>
                        <input
                          id="thumbnail-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailChange}
                          disabled={isUploadingThumbnail}
                          className="hidden"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Recommended: 16:9 aspect ratio, max 5MB
                          <br />
                          Supported formats: JPG, PNG, GIF, WebP
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Production House */}
                  <div>
                    <label
                      htmlFor="productionHouseId"
                      className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"
                    >
                      <Building2 className="h-4 w-4" />
                      Production House <span className="text-red-400">*</span>
                    </label>
                    <ProductionHouseCombobox
                      control={control}
                      name="productionHouseId"
                      productionHouses={productionHouses}
                      error={errors.productionHouseId}
                      disabled={isPending || isCreatingProductionHouse}
                      onCreateNew={onCreateProductionHouse}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Description
                    </label>
                    <textarea
                      id="description"
                      {...register("description")}
                      rows={3}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 resize-none"
                      placeholder="Brief description of the production"
                    />
                  </div>

                  {/* Dates and Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="startDate"
                        className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4" />
                        Start Date
                      </label>
                      <input
                        id="startDate"
                        type="date"
                        {...register("startDate")}
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="endDate"
                        className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4" />
                        End Date
                      </label>
                      <input
                        id="endDate"
                        type="date"
                        {...register("endDate")}
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label
                      htmlFor="status"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Status *
                    </label>
                    <select
                      id="status"
                      {...register("status")}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500"
                    >
                      <option value="Pre-Production">Pre-Production</option>
                      <option value="Shooting">Shooting</option>
                      <option value="Wrapped">Wrapped</option>
                    </select>
                    {errors.status && (
                      <p className="mt-1 text-sm text-red-400">
                        {errors.status.message}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2.5 text-gray-300 hover:text-white transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-6 py-2.5 bg-gradient-to-r from-cinematic-gold-500 to-cinematic-gold-600 text-gray-950 rounded-lg hover:from-cinematic-gold-600 hover:to-cinematic-gold-700 transition-all font-semibold shadow-lg shadow-cinematic-gold-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? "Updating..." : "Update Production"}
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
