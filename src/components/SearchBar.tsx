import { useState, useEffect, useRef } from "react";
import { Search, Film, Clapperboard, User, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useNavigate } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { handleErrorWithToast } from "~/utils/errorMessages";

export function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trpc = useTRPC();
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch search results
  const searchResults = useQuery(
    trpc.searchAll.queryOptions(
      {
        token: token || "",
        query: debouncedQuery,
      },
      {
        enabled: !!token && debouncedQuery.trim().length > 0,
        staleTime: 30000, // Cache results for 30 seconds
      }
    )
  );

  // Show dropdown when there's a query and results
  useEffect(() => {
    if (debouncedQuery.trim().length > 0 && searchResults.data) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [debouncedQuery, searchResults.data]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Handle errors
  useEffect(() => {
    if (searchResults.error) {
      handleErrorWithToast(searchResults.error, toast);
    }
  }, [searchResults.error]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleResultClick = (type: "production" | "scene" | "actor", id: number, showId?: number) => {
    setIsOpen(false);
    setSearchQuery("");

    if (type === "production") {
      navigate({ to: `/shows/${id}` });
    } else if (type === "scene" && showId) {
      navigate({ to: `/shows/${showId}/scenes` });
    } else if (type === "actor" && showId) {
      navigate({ to: `/shows/${showId}/actors` });
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const hasResults =
    searchResults.data &&
    (searchResults.data.productions.length > 0 ||
      searchResults.data.scenes.length > 0 ||
      searchResults.data.actors.length > 0);

  return (
    <div className="relative w-full max-w-2xl">
      <form onSubmit={handleSearch}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search productions, scenes, actors..."
            className="block w-full pl-10 pr-10 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cinematic-gold-500/50 focus:border-cinematic-gold-500 transition-all hover:bg-gray-800/70"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto"
        >
          {searchResults.isLoading && (
            <div className="p-4 text-center text-gray-400">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cinematic-gold-500"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          )}

          {!searchResults.isLoading && !hasResults && (
            <div className="p-4 text-center text-gray-400">
              <p className="text-sm">No results found for "{debouncedQuery}"</p>
            </div>
          )}

          {!searchResults.isLoading && hasResults && (
            <div className="py-2">
              {/* Productions */}
              {searchResults.data.productions.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Productions
                  </div>
                  {searchResults.data.productions.map((production) => (
                    <button
                      key={production.id}
                      onClick={() => handleResultClick("production", production.id)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-700/50 transition-colors flex items-start gap-3"
                    >
                      <Film className="h-5 w-5 text-cinematic-gold-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-100 truncate">
                          {production.title}
                        </p>
                        {production.productionHouse && (
                          <p className="text-xs text-gray-400 truncate">
                            {production.productionHouse.name}
                          </p>
                        )}
                        {production.description && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {production.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-700/50 rounded">
                        {production.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Scenes */}
              {searchResults.data.scenes.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Scenes
                  </div>
                  {searchResults.data.scenes.map((scene) => (
                    <button
                      key={scene.id}
                      onClick={() => handleResultClick("scene", scene.id, scene.show.id)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-700/50 transition-colors flex items-start gap-3"
                    >
                      <Clapperboard className="h-5 w-5 text-cinematic-gold-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-100">
                          Scene {scene.sceneNumber}
                          {scene.title && `: ${scene.title}`}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {scene.show.title}
                        </p>
                        {scene.location && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            📍 {scene.location}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-700/50 rounded">
                        {scene.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Actors */}
              {searchResults.data.actors.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actors
                  </div>
                  {searchResults.data.actors.map((actor) => (
                    <button
                      key={actor.id}
                      onClick={() =>
                        handleResultClick("actor", actor.id, actor.roles[0]?.showId)
                      }
                      className="w-full px-4 py-2 text-left hover:bg-gray-700/50 transition-colors flex items-start gap-3"
                    >
                      <div className="flex-shrink-0">
                        {actor.profileImage ? (
                          <img
                            src={actor.profileImage}
                            alt={actor.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-100 truncate">
                          {actor.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{actor.email}</p>
                        {actor.roles.length > 0 && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {actor.roles.map((role) => role.characterName).join(", ")}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
