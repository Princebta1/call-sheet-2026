import { useState, Fragment } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { X, Filter, Search, Users, MapPin, Film, Check } from "lucide-react";

interface Show {
  id: number;
  title: string;
}

interface User {
  id: number;
  name: string;
  profileImage?: string | null;
}

interface CalendarFiltersProps {
  shows?: Show[];
  users: User[];
  selectedShowIds?: number[];
  selectedLocation?: string;
  selectedActorIds?: number[];
  onShowIdsChange?: (showIds: number[]) => void;
  onLocationChange?: (location: string) => void;
  onActorIdsChange?: (actorIds: number[]) => void;
  onClearAll?: () => void;
}

export function CalendarFilters({
  shows,
  users,
  selectedShowIds = [],
  selectedLocation = "",
  selectedActorIds = [],
  onShowIdsChange,
  onLocationChange,
  onActorIdsChange,
  onClearAll,
}: CalendarFiltersProps) {
  const [actorQuery, setActorQuery] = useState("");
  const [showQuery, setShowQuery] = useState("");

  const selectedActors = users.filter((u) => selectedActorIds.includes(u.id));
  const selectedShows = shows?.filter((s) => selectedShowIds.includes(s.id)) || [];

  const filteredUsers = actorQuery === ""
    ? users
    : users.filter((user) =>
        user.name.toLowerCase().includes(actorQuery.toLowerCase())
      );

  const filteredShows = showQuery === ""
    ? shows || []
    : (shows || []).filter((show) =>
        show.title.toLowerCase().includes(showQuery.toLowerCase())
      );

  const hasActiveFilters =
    selectedShowIds.length > 0 ||
    selectedLocation.trim() !== "" ||
    selectedActorIds.length > 0;

  const handleRemoveShow = (showId: number) => {
    if (onShowIdsChange) {
      onShowIdsChange(selectedShowIds.filter((id) => id !== showId));
    }
  };

  const handleRemoveActor = (actorId: number) => {
    if (onActorIdsChange) {
      onActorIdsChange(selectedActorIds.filter((id) => id !== actorId));
    }
  };

  const handleClearLocation = () => {
    if (onLocationChange) {
      onLocationChange("");
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-cinematic-gold-400" />
          <h3 className="text-lg font-bold text-white">Filters</h3>
          {hasActiveFilters && (
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
              {(selectedShowIds.length > 0 ? 1 : 0) +
                (selectedLocation.trim() !== "" ? 1 : 0) +
                (selectedActorIds.length > 0 ? 1 : 0)}{" "}
              active
            </span>
          )}
        </div>
        {hasActiveFilters && onClearAll && (
          <button
            onClick={onClearAll}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Show Filter (only if shows are provided) */}
        {shows && onShowIdsChange && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              <Film className="h-4 w-4 inline mr-1" />
              Shows
            </label>
            <Combobox
              value={selectedShowIds}
              onChange={onShowIdsChange}
              multiple
            >
              <div className="relative">
                <Combobox.Input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent text-sm"
                  placeholder="Select shows..."
                  onChange={(e) => setShowQuery(e.target.value)}
                  displayValue={() => ""}
                />
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                  afterLeave={() => setShowQuery("")}
                >
                  <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-gray-800 border border-gray-700 py-1 shadow-lg">
                    {filteredShows.length === 0 && showQuery !== "" ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No shows found.
                      </div>
                    ) : (
                      filteredShows.map((show) => (
                        <Combobox.Option
                          key={show.id}
                          value={show.id}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                              active
                                ? "bg-cinematic-gold-500/10 text-white"
                                : "text-gray-300"
                            }`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? "font-medium" : "font-normal"
                                }`}
                              >
                                {show.title}
                              </span>
                              {selected && (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-cinematic-gold-400">
                                  <Check className="h-4 w-4" />
                                </span>
                              )}
                            </>
                          )}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </Transition>
              </div>
            </Combobox>
          </div>
        )}

        {/* Location Filter */}
        {onLocationChange && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              Location
            </label>
            <div className="relative">
              <input
                type="text"
                value={selectedLocation}
                onChange={(e) => onLocationChange(e.target.value)}
                placeholder="Search location..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent text-sm"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            </div>
          </div>
        )}

        {/* Cast Member Filter */}
        {onActorIdsChange && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              <Users className="h-4 w-4 inline mr-1" />
              Cast Members
            </label>
            <Combobox
              value={selectedActorIds}
              onChange={onActorIdsChange}
              multiple
            >
              <div className="relative">
                <Combobox.Input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500 focus:border-transparent text-sm"
                  placeholder="Select cast members..."
                  onChange={(e) => setActorQuery(e.target.value)}
                  displayValue={() => ""}
                />
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                  afterLeave={() => setActorQuery("")}
                >
                  <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-gray-800 border border-gray-700 py-1 shadow-lg">
                    {filteredUsers.length === 0 && actorQuery !== "" ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No cast members found.
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <Combobox.Option
                          key={user.id}
                          value={user.id}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                              active
                                ? "bg-cinematic-gold-500/10 text-white"
                                : "text-gray-300"
                            }`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? "font-medium" : "font-normal"
                                }`}
                              >
                                {user.name}
                              </span>
                              {selected && (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-cinematic-gold-400">
                                  <Check className="h-4 w-4" />
                                </span>
                              )}
                            </>
                          )}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </Transition>
              </div>
            </Combobox>
          </div>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
          {selectedShows.map((show) => (
            <span
              key={show.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-cinematic-blue-500/20 text-cinematic-blue-400 border border-cinematic-blue-500/30 rounded-full text-sm"
            >
              <Film className="h-3 w-3" />
              {show.title}
              <button
                onClick={() => handleRemoveShow(show.id)}
                className="hover:text-cinematic-blue-300"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selectedLocation.trim() !== "" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cinematic-emerald-500/20 text-cinematic-emerald-400 border border-cinematic-emerald-500/30 rounded-full text-sm">
              <MapPin className="h-3 w-3" />
              {selectedLocation}
              <button
                onClick={handleClearLocation}
                className="hover:text-cinematic-emerald-300"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedActors.map((actor) => (
            <span
              key={actor.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-sm"
            >
              <Users className="h-3 w-3" />
              {actor.name}
              <button
                onClick={() => handleRemoveActor(actor.id)}
                className="hover:text-purple-300"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
