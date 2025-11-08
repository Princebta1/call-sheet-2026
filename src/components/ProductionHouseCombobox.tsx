import { Combobox, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { Control, Controller, FieldError } from "react-hook-form";
import { Check, ChevronsUpDown, Building2, Plus } from "lucide-react";

interface ProductionHouseComboboxProps {
  control: Control<any>;
  name: string;
  productionHouses: Array<{
    id: number;
    name: string;
  }>;
  error?: FieldError;
  disabled?: boolean;
  onCreateNew?: (name: string) => void;
}

export function ProductionHouseCombobox({
  control,
  name,
  productionHouses,
  error,
  disabled = false,
  onCreateNew,
}: ProductionHouseComboboxProps) {
  const [query, setQuery] = useState("");

  const filteredHouses =
    query === ""
      ? productionHouses
      : productionHouses.filter((house) =>
          house.name.toLowerCase().includes(query.toLowerCase())
        );

  const showCreateOption = query !== "" && !filteredHouses.some(
    (house) => house.name.toLowerCase() === query.toLowerCase()
  );

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => {
        // Find the selected house by ID
        const selectedHouse = productionHouses.find(
          (house) => house.id === value
        );

        return (
          <div className="relative">
            <Combobox
              value={value}
              onChange={(newValue) => {
                if (newValue === "create-new" && query && onCreateNew) {
                  onCreateNew(query);
                  setQuery("");
                } else {
                  onChange(newValue);
                }
              }}
              disabled={disabled}
            >
              <div className="relative">
                <div className="relative w-full">
                  <Combobox.Input
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 pr-10 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent transition-all"
                    displayValue={(houseId: number | undefined) => {
                      if (!houseId) return "";
                      const house = productionHouses.find((h) => h.id === houseId);
                      return house?.name || "";
                    }}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Select or type to create..."
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronsUpDown
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </Combobox.Button>
                </div>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                  afterLeave={() => setQuery("")}
                >
                  <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-gray-800 border border-gray-700 py-1 shadow-lg focus:outline-none">
                    {filteredHouses.length === 0 && query === "" ? (
                      <div className="relative cursor-default select-none py-2 px-4 text-gray-400">
                        No production houses available
                      </div>
                    ) : null}
                    
                    {filteredHouses.map((house) => (
                      <Combobox.Option
                        key={house.id}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                            active
                              ? "bg-cinematic-gold-500/20 text-cinematic-gold-400"
                              : "text-gray-300"
                          }`
                        }
                        value={house.id}
                      >
                        {({ selected, active }) => (
                          <>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <span
                                className={`block truncate ${
                                  selected ? "font-medium" : "font-normal"
                                }`}
                              >
                                {house.name}
                              </span>
                            </div>
                            {selected ? (
                              <span
                                className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                  active ? "text-cinematic-gold-400" : "text-cinematic-gold-500"
                                }`}
                              >
                                <Check className="h-5 w-5" aria-hidden="true" />
                              </span>
                            ) : null}
                          </>
                        )}
                      </Combobox.Option>
                    ))}

                    {showCreateOption && onCreateNew && (
                      <Combobox.Option
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-2 pl-10 pr-4 border-t border-gray-700 ${
                            active
                              ? "bg-cinematic-gold-500/20 text-cinematic-gold-400"
                              : "text-gray-300"
                          }`
                        }
                        value="create-new"
                      >
                        {({ active }) => (
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span className="font-medium">
                              Create "{query}"
                            </span>
                          </div>
                        )}
                      </Combobox.Option>
                    )}

                    {query !== "" && filteredHouses.length === 0 && !showCreateOption && (
                      <div className="relative cursor-default select-none py-2 px-4 text-gray-400">
                        No results found
                      </div>
                    )}
                  </Combobox.Options>
                </Transition>
              </div>
            </Combobox>
            {error && (
              <p className="mt-2 text-sm text-red-400">{error.message}</p>
            )}
          </div>
        );
      }}
    />
  );
}
