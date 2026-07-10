import React, { useState } from 'react';
import { X, ChevronDown, GripVertical, Plus, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const AddPipeline = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    pipelineName: 'Summer Gala 2024',
    eventType: 'Wedding',
    eventDate: null, // Changed to null for DatePicker
    venueName: 'Grand Ballroom',
    guestCount: '150',
    serviceType: 'Buffet',
  });

  const [workflowPhases, setWorkflowPhases] = useState({
    preEvent: {
      name: 'Pre-Event Phase',
      expanded: true,
      stages: [
        { id: 1, name: 'Client Inquiry', isEditing: false },
        { id: 2, name: 'Menu Planning', isEditing: false },
      ]
    },
    eventDay: {
      name: 'Event-Day Phase',
      expanded: true,
      stages: []
    },
    postEvent: {
      name: 'Post-Event Phase',
      expanded: true,
      stages: []
    }
  });

  const [draggedStage, setDraggedStage] = useState(null);
  const [draggedPhase, setDraggedPhase] = useState(null);

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePhase = (phase) => {
    setWorkflowPhases(prev => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        expanded: !prev[phase].expanded
      }
    }));
  };

  const addStage = (phase, e) => {
    e.stopPropagation();
    const newStage = { 
      id: Date.now(), 
      name: `New Stage ${workflowPhases[phase].stages.length + 1}`,
      isEditing: true
    };
    setWorkflowPhases(prev => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        stages: [...prev[phase].stages, newStage]
      }
    }));
  };

  const deleteStage = (phase, stageId, e) => {
    e.stopPropagation();
    setWorkflowPhases(prev => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        stages: prev[phase].stages.filter(stage => stage.id !== stageId)
      }
    }));
  };

  const editStage = (phase, stageId) => {
    setWorkflowPhases(prev => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        stages: prev[phase].stages.map(stage =>
          stage.id === stageId ? { ...stage, isEditing: true } : stage
        )
      }
    }));
  };

  const updateStageName = (phase, stageId, newName) => {
    setWorkflowPhases(prev => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        stages: prev[phase].stages.map(stage =>
          stage.id === stageId ? { ...stage, name: newName } : stage
        )
      }
    }));
  };

  const saveStage = (phase, stageId) => {
    setWorkflowPhases(prev => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        stages: prev[phase].stages.map(stage =>
          stage.id === stageId ? { ...stage, isEditing: false } : stage
        )
      }
    }));
  };

  // Drag and Drop handlers
  const handleDragStart = (phase, stageId) => {
    setDraggedStage(stageId);
    setDraggedPhase(phase);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (phase, dropIndex) => {
    if (!draggedStage || !draggedPhase) return;

    const sourcePhase = draggedPhase;
    const sourceStages = [...workflowPhases[sourcePhase].stages];
    const draggedIndex = sourceStages.findIndex(s => s.id === draggedStage);
    const draggedItem = sourceStages[draggedIndex];

    // Remove from source
    sourceStages.splice(draggedIndex, 1);

    // Add to target
    const targetStages = sourcePhase === phase 
      ? sourceStages 
      : [...workflowPhases[phase].stages];
    
    targetStages.splice(dropIndex, 0, draggedItem);

    setWorkflowPhases(prev => ({
      ...prev,
      [sourcePhase]: {
        ...prev[sourcePhase],
        stages: sourcePhase === phase ? targetStages : sourceStages
      },
      ...(sourcePhase !== phase && {
        [phase]: {
          ...prev[phase],
          stages: targetStages
        }
      })
    }));

    setDraggedStage(null);
    setDraggedPhase(null);
  };

  const handleReset = () => {
    setFormData({
      pipelineName: 'Summer Gala 2024',
      eventType: 'Wedding',
      eventDate: null,
      venueName: 'Grand Ballroom',
      guestCount: '150',
      serviceType: 'Buffet',
    });
    setWorkflowPhases({
      preEvent: {
        name: 'Pre-Event Phase',
        expanded: true,
        stages: [
          { id: 1, name: 'Client Inquiry', isEditing: false },
          { id: 2, name: 'Menu Planning', isEditing: false },
        ]
      },
      eventDay: {
        name: 'Event-Day Phase',
        expanded: true,
        stages: []
      },
      postEvent: {
        name: 'Post-Event Phase',
        expanded: true,
        stages: []
      }
    });
  };

  const handleSaveAndExit = () => {
    if (onSave) {
      onSave({ formData, workflowPhases });
    }
    onClose();
  };

  const renderStage = (phase, stage, index) => (
    <div
      key={stage.id}
      draggable
      onDragStart={() => handleDragStart(phase, stage.id)}
      onDragOver={handleDragOver}
      onDrop={() => handleDrop(phase, index)}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 bg-blue-20 rounded-md border border-blue-800 group cursor-grab",
        draggedStage === stage.id && "opacity-50"
      )}
    >
      <GripVertical className="w-4 h-4 text-slate-700 flex-shrink-0" />
      
      {stage.isEditing ? (
        <input
          type="text"
          value={stage.name}
          onChange={(e) => updateStageName(phase, stage.id, e.target.value)}
          onBlur={() => saveStage(phase, stage.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveStage(phase, stage.id);
          }}
          className="flex-1 px-2 py-1 border border-[#005BA8] rounded text-sm text-[#005BA8] focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      ) : (
        <span 
          className="flex-1 font-semibold text-sm text-blue-900 cursor-pointer"
          onClick={() => editStage(phase, stage.id)}
        >
          {stage.name}
        </span>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {stage.isEditing ? (
          <button
            onClick={() => saveStage(phase, stage.id)}
            className="p-1 hover:bg-green-100 rounded transition-colors"
          >
            <Check className="w-3.5 h-3.5 text-green-600" />
          </button>
        ) : (
          <button
            onClick={(e) => deleteStage(phase, stage.id, e)}
            className="p-1 hover:bg-red-100 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Modal */}
      <div
        className="fixed right-4 top-4 bottom-4 bg-white z-50 shadow-2xl rounded-lg w-full max-w-[720px] animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
      >
        <div className="h-full flex flex-col rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b shrink-0 bg-slate-50/50">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 flex items-center gap-2">
                Create Catering Pipeline
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure your catering event workflow and specialized service parameters.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Form Fields - Row 1 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Pipeline Name
                  </label>
                  <input
                    type="text"
                    value={formData.pipelineName}
                    onChange={(e) => handleFormChange('pipelineName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Summer Gala 2024"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Event Type
                  </label>
                  <select
                    value={formData.eventType}
                    onChange={(e) => handleFormChange('eventType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option>Wedding</option>
                    <option>Corporate</option>
                    <option>Birthday</option>
                    <option>Conference</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Event Date
                  </label>
                  <DatePicker
                    selected={formData.eventDate}
                    onChange={(date) => handleFormChange('eventDate', date)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholderText="mm/dd/yyyy"
                    dateFormat="MM/dd/yyyy"
                  />
                </div>
              </div>

              {/* Form Fields - Row 2 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Venue Name
                  </label>
                  <input
                    type="text"
                    value={formData.venueName}
                    onChange={(e) => handleFormChange('venueName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Grand Ballroom"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Guest Count
                  </label>
                  <input
                    type="number"
                    value={formData.guestCount}
                    onChange={(e) => handleFormChange('guestCount', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="150"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Service Type
                  </label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => handleFormChange('serviceType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option>Buffet</option>
                    <option>Plated</option>
                    <option>Family Style</option>
                    <option>Cocktail</option>
                  </select>
                </div>
              </div>

              {/* Workflow Phases */}
              <div className="space-y-4 mt-8">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Workflow Phases
                </h3>

                {/* Pre-Event Phase */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => togglePhase('preEvent')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown 
                        className={cn(
                          "w-4 h-4 text-slate-400 transition-transform",
                          workflowPhases.preEvent.expanded && "rotate-0",
                          !workflowPhases.preEvent.expanded && "-rotate-90"
                        )} 
                      />
                      <span className="font-medium text-sm text-slate-700">
                        {workflowPhases.preEvent.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => addStage('preEvent', e)}
                      className="text-[#005BA8] hover:text-[#005BA8] cursor-pointer text-xs font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Stage
                    </button>
                  </button>
                  {workflowPhases.preEvent.expanded && (
                    <div className="px-4 pb-4 space-y-2">
                      {workflowPhases.preEvent.stages.length === 0 ? (
                        <div className="text-center py-12">
                          <X className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                          <p className="text-xs text-slate-400 italic">
                            No stages added for Pre-Event yet. Define kitchen prep or service milestones.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {workflowPhases.preEvent.stages.map((stage, index) => 
                            renderStage('preEvent', stage, index)
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Event-Day Phase */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => togglePhase('eventDay')}
                    className="w-full flex items-center justify-between bg-slate-50 px-4 py-3 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown 
                        className={cn(
                          "w-4 h-4 text-slate-400 transition-transform",
                          workflowPhases.eventDay.expanded && "rotate-0",
                          !workflowPhases.eventDay.expanded && "-rotate-90"
                        )} 
                      />
                      <span className="font-medium text-sm text-slate-700">
                        {workflowPhases.eventDay.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => addStage('eventDay', e)}
                      className="text-[#005BA8] hover:text-[#005BA8]  cursor-pointer text-xs font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Stage
                    </button>
                  </button>
                  {workflowPhases.eventDay.expanded && (
                    <div className="px-4 pb-4">
                      {workflowPhases.eventDay.stages.length === 0 ? (
                        <div className="text-center py-12">
                          <X className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                          <p className="text-xs text-slate-400 italic">
                            No stages added for event day yet. Define kitchen prep or service milestones.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {workflowPhases.eventDay.stages.map((stage, index) => 
                            renderStage('eventDay', stage, index)
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Post-Event Phase */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => togglePhase('postEvent')}
                    className="w-full flex items-center bg-slate-50 justify-between px-4 py-3  transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown 
                        className={cn(
                          "w-4 h-4 text-slate-400 transition-transform",
                          workflowPhases.postEvent.expanded && "rotate-0",
                          !workflowPhases.postEvent.expanded && "-rotate-90"
                        )} 
                      />
                      <span className="font-medium text-sm text-slate-700">
                        {workflowPhases.postEvent.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => addStage('postEvent', e)}
                      className="text-[#005BA8] hover:text-[#005BA8]  cursor-pointer text-xs font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Stage
                    </button>
                  </button>
                  {workflowPhases.postEvent.expanded && (
                    <div className="px-4 pb-4">
                      {workflowPhases.postEvent.stages.length === 0 ? (
                        <div className="text-center py-12">
                          <X className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                          <p className="text-xs text-slate-400 italic">
                            No stages added for Post Event yet. Define kitchen prep or service milestones.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {workflowPhases.postEvent.stages.map((stage, index) => 
                            renderStage('postEvent', stage, index)
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="shrink-0 px-6 py-4 border-t bg-white">
            <div className="flex items-center justify-end">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 cursor-pointer py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAndExit}
                  className="px-4 cursor-pointer py-2 text-sm font-medium text-white bg-[#005BA8] rounded-md hover:bg-[#005BA8] transition-colors flex items-center gap-2"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddPipeline;