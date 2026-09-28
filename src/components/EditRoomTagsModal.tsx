import React, { useState } from 'react';
import { 
  X, 
  Tag, 
  Layers, 
  Plus, 
  Check, 
  Trash2, 
  Edit2, 
  BedDouble, 
  Sparkles,
  Sliders,
  RotateCw,
  Building
} from 'lucide-react';
import { Room } from '../types/erp';
import { dataStore } from '../config/firebase';

interface EditRoomTagsModalProps {
  room?: Room | null;
  rooms: Room[];
  isOpen: boolean;
  onClose: () => void;
  onRoomsUpdated: () => void;
  initialMode?: 'single' | 'global';
}

export default function EditRoomTagsModal({
  room,
  rooms,
  isOpen,
  onClose,
  onRoomsUpdated,
  initialMode = 'single'
}: EditRoomTagsModalProps) {
  if (!isOpen) return null;

  const [activeMode, setActiveMode] = useState<'single' | 'global'>(
    room ? initialMode : 'global'
  );

  // Single room edit state
  const [selectedRoomId, setSelectedRoomId] = useState<string>(room?.id || rooms[0]?.id || '');
  const activeRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];

  const [editCategory, setEditCategory] = useState<string>(activeRoom?.type || 'Standard Room');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [tagsList, setTagsList] = useState<string[]>(activeRoom?.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editingTagValue, setEditingTagValue] = useState('');

  const [amenitiesList, setAmenitiesList] = useState<string[]>(activeRoom?.amenities || []);
  const [newAmenityInput, setNewAmenityInput] = useState('');

  // Global edit state
  const [renameTargetType, setRenameTargetType] = useState<'category' | 'tag'>('category');
  const [globalOldName, setGlobalOldName] = useState('');
  const [globalNewName, setGlobalNewName] = useState('');
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  // When changing room in single mode
  const handleSelectRoom = (rId: string) => {
    setSelectedRoomId(rId);
    const target = rooms.find(r => r.id === rId);
    if (target) {
      setEditCategory(target.type || 'Standard');
      setTagsList(target.tags || []);
      setAmenitiesList(target.amenities || []);
      setIsCustomCategory(false);
      setCustomCategoryInput('');
    }
  };

  // Distinct categories and tags across all rooms
  const allCategories = Array.from(new Set(rooms.map(r => r.type).filter(Boolean)));
  const allTagsWithCount = rooms.reduce((acc, r) => {
    (r.tags || []).forEach(t => {
      acc[t] = (acc[t] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const allAmenitiesWithCount = rooms.reduce((acc, r) => {
    (r.amenities || []).forEach(a => {
      acc[a] = (acc[a] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // Tag manipulation
  const handleAddTag = () => {
    const val = newTagInput.trim();
    if (!val) return;
    if (!tagsList.includes(val)) {
      setTagsList([...tagsList, val]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTagsList(tagsList.filter(t => t !== tagToRemove));
  };

  const handleStartRenameTag = (index: number, val: string) => {
    setEditingTagIndex(index);
    setEditingTagValue(val);
  };

  const handleSaveRenameTag = (index: number) => {
    const trimmed = editingTagValue.trim();
    if (trimmed) {
      const updated = [...tagsList];
      updated[index] = trimmed;
      setTagsList(updated);
    }
    setEditingTagIndex(null);
    setEditingTagValue('');
  };

  // Amenity manipulation
  const handleAddAmenity = () => {
    const val = newAmenityInput.trim();
    if (!val) return;
    if (!amenitiesList.includes(val)) {
      setAmenitiesList([...amenitiesList, val]);
    }
    setNewAmenityInput('');
  };

  const handleRemoveAmenity = (amenityToRemove: string) => {
    setAmenitiesList(amenitiesList.filter(a => a !== amenityToRemove));
  };

  // Save Single Room
  const handleSaveSingleRoom = () => {
    if (!activeRoom) return;
    const finalCategory = isCustomCategory ? customCategoryInput.trim() || editCategory : editCategory;

    dataStore.updateRoomTagsAndCategory(
      activeRoom.id,
      amenitiesList,
      tagsList,
      finalCategory
    );

    onRoomsUpdated();
    onClose();
  };

  // Save Global Rename
  const handleExecuteGlobalRename = () => {
    if (!globalOldName.trim() || !globalNewName.trim()) {
      alert('Please specify both the current name and the new replacement name.');
      return;
    }

    if (renameTargetType === 'category') {
      dataStore.renameCategoryGlobally(globalOldName, globalNewName);
      setGlobalMessage(`Renamed category "${globalOldName}" to "${globalNewName}" across all room listings.`);
    } else {
      dataStore.renameTagGlobally(globalOldName, globalNewName);
      setGlobalMessage(`Renamed tag "${globalOldName}" to "${globalNewName}" across all room listings.`);
    }

    onRoomsUpdated();
    setTimeout(() => setGlobalMessage(null), 4000);
    setGlobalOldName('');
    setGlobalNewName('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Room Tags & Category Manager
              </h3>
              <p className="text-[11px] text-slate-500">
                Edit categories, custom tags, and amenity badges per room or rename globally
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Single Room vs Global Bulk */}
        <div className="px-5 pt-3 border-b border-slate-100 flex items-center gap-2">
          <button
            onClick={() => setActiveMode('single')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeMode === 'single'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BedDouble className="w-4 h-4" />
            Single Room Tags & Category
          </button>
          <button
            onClick={() => setActiveMode('global')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeMode === 'global'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Global Tags & Category Renaming
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {activeMode === 'single' ? (
            <div className="space-y-4">
              {/* Room Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select Room to Configure:
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => handleSelectRoom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      Room #{r.number} - {r.name} ({r.type || 'Standard'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Category (Type) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-rose-600" />
                    Room Category / Type
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(!isCustomCategory)}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700"
                  >
                    {isCustomCategory ? 'Choose Existing' : '+ Type Custom Category'}
                  </button>
                </div>

                {!isCustomCategory ? (
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Deluxe Suite">Deluxe Suite</option>
                    <option value="Executive Room">Executive Room</option>
                    <option value="Penthouse Oceanview">Penthouse Oceanview</option>
                    <option value="Standard King">Standard King</option>
                    <option value="Family Villa">Family Villa</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter custom category name (e.g. Presidential Loft)..."
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                )}
              </div>

              {/* Tags Section */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-rose-600" />
                    Listing Tags & Badges
                  </label>
                  <span className="text-[11px] text-slate-400">Click any tag to rename</span>
                </div>

                {/* Tags Pills Display */}
                <div className="flex flex-wrap gap-1.5 min-h-[36px] bg-white p-2.5 rounded-lg border border-slate-200">
                  {tagsList.map((tag, idx) => {
                    const isEditing = editingTagIndex === idx;
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full font-bold group"
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingTagValue}
                            onChange={(e) => setEditingTagValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRenameTag(idx);
                              if (e.key === 'Escape') setEditingTagIndex(null);
                            }}
                            autoFocus
                            className="w-20 px-1 py-0.5 bg-white border border-rose-300 rounded text-xs text-rose-900"
                          />
                        ) : (
                          <span
                            onClick={() => handleStartRenameTag(idx, tag)}
                            className="cursor-pointer hover:underline"
                            title="Click to rename"
                          >
                            {tag}
                          </span>
                        )}

                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => handleSaveRenameTag(idx)}
                            className="text-rose-600 hover:text-rose-800"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-rose-400 hover:text-rose-700 ml-0.5"
                            title="Remove tag"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                  {tagsList.length === 0 && (
                    <span className="text-slate-400 text-xs italic">No tags assigned to this room yet.</span>
                  )}
                </div>

                {/* Add Tag Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type new tag (e.g. Balcony, Ocean View, King Bed, VIP)..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Tag
                  </button>
                </div>
              </div>

              {/* Amenities Section */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Room Amenities List
                  </label>
                  <span className="text-[11px] text-slate-400">{amenitiesList.length} items</span>
                </div>

                {/* Amenities Pills Display */}
                <div className="flex flex-wrap gap-1.5 min-h-[36px] bg-white p-2.5 rounded-lg border border-slate-200">
                  {amenitiesList.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full font-medium"
                    >
                      <span>{amenity}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAmenity(amenity)}
                        className="text-indigo-400 hover:text-indigo-700 ml-0.5"
                        title="Remove amenity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {amenitiesList.length === 0 && (
                    <span className="text-slate-400 text-xs italic">No amenities specified.</span>
                  )}
                </div>

                {/* Add Amenity Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add amenity (e.g. Free WiFi, Espresso Bar, Jacuzzi, Mini Bar)..."
                    value={newAmenityInput}
                    onChange={(e) => setNewAmenityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAmenity();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAmenity}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Amenity
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Global Rename Mode */
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-900">
                <p className="font-bold">Global Tag & Category Refactoring</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Renaming here applies instantly across all rooms in the hotel database.
                </p>
              </div>

              {globalMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  {globalMessage}
                </div>
              )}

              {/* Target Type Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRenameTargetType('category');
                    setGlobalOldName('');
                    setGlobalNewName('');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    renameTargetType === 'category'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Rename Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenameTargetType('tag');
                    setGlobalOldName('');
                    setGlobalNewName('');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    renameTargetType === 'tag'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Rename Tag
                </button>
              </div>

              {/* Global Rename Form */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Existing {renameTargetType === 'category' ? 'Category' : 'Tag'} Name:
                    </label>
                    <select
                      value={globalOldName}
                      onChange={(e) => setGlobalOldName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    >
                      <option value="">-- Choose {renameTargetType} to rename --</option>
                      {renameTargetType === 'category' ? (
                        allCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))
                      ) : (
                        Object.keys(allTagsWithCount).map(tag => (
                          <option key={tag} value={tag}>
                            {tag} ({allTagsWithCount[tag]} room{allTagsWithCount[tag] > 1 ? 's' : ''})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      New Replacement Name:
                    </label>
                    <input
                      type="text"
                      placeholder={`New ${renameTargetType} name...`}
                      value={globalNewName}
                      onChange={(e) => setGlobalNewName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleExecuteGlobalRename}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Execute Global Rename
                  </button>
                </div>
              </div>

              {/* Current Categories & Tags Summary Table */}
              <div className="space-y-2">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Active Global Registry Summary
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <p className="font-bold text-slate-800 text-[11px]">Room Categories ({allCategories.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {allCategories.map(cat => (
                        <span 
                          key={cat}
                          onClick={() => {
                            setRenameTargetType('category');
                            setGlobalOldName(cat);
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded text-[10px] font-semibold cursor-pointer border border-slate-200"
                          title="Click to rename"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <p className="font-bold text-slate-800 text-[11px]">Active Tags ({Object.keys(allTagsWithCount).length})</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(allTagsWithCount).map(tag => (
                        <span 
                          key={tag}
                          onClick={() => {
                            setRenameTargetType('tag');
                            setGlobalOldName(tag);
                          }}
                          className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-semibold cursor-pointer border border-rose-200"
                          title="Click to rename"
                        >
                          {tag} ({allTagsWithCount[tag]})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
          >
            Cancel / Close
          </button>

          {activeMode === 'single' && (
            <button
              type="button"
              onClick={handleSaveSingleRoom}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              Save Room Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
