
import React, { Fragment, useState } from 'react';
import { Search, Plus, Layout, Sparkles, MoreVertical, Edit2, GripVertical } from 'lucide-react';
import { Container } from '@/components/common/container';
import { toAbsoluteUrl } from '@/lib/helpers';
import { useNavigate } from 'react-router';
import AddPipeline from '../../partials/modal/add-pipeline/AddPipeline';
import SidebarModal from '../../components/ui/sidebar';



const CreatePipeline = () => {
  const [pipelines, setPipelines] = useState([
    {
      id: 1,
      name: 'Sales Pipeline',
      createdAt: 'Apr 14, 2025',
      createdBy: 'Manan Gandhi',
      icon: '📊',
      iconColor: 'bg-blue-50 border-blue-500',
    },
    {
      id: 2,
      name: 'Social Media',
      createdAt: 'Jun 10, 2025',
      createdBy: 'Manan Gandhi',
      icon: '📱',
      iconColor: 'bg-green-50 border-green-500',
    },
    {
      id: 3,
      name: 'My Pipeline',
      createdAt: 'Jun 02, 2025',
      createdBy: 'Manan Gandhi',
      icon: '📈',
      iconColor: 'bg-purple-50 border-purple-500',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [notification, setNotification] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const openCreatePipelineModal = () => {   
    setIsSidebarOpen(true);
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverItem(index);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedItem === null || draggedItem === dropIndex) {
      setDragOverItem(null);
      return;
    }

    const newPipelines = [...pipelines];
    const draggedPipeline = newPipelines[draggedItem];
    
    newPipelines.splice(draggedItem, 1);
    newPipelines.splice(dropIndex, 0, draggedPipeline);
    
    setPipelines(newPipelines);
    setDraggedItem(null);
    setDragOverItem(null);
    showNotification('Pipeline order updated!');
  };

  const createPipeline = () => {
    navigate("/viewpipeline");
  };

  const editPipeline = (id) => {
    
  };

  const filteredPipelines = pipelines.filter((pipeline) =>
    pipeline.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Fragment>
        <Container>
            <div>
      
        <div className="bg-white shadow-indigo-100/50 overflow-hidden">
          {/* Header */}
          <div className=" bg-gradient-to-r from-white to-slate-50/50 border-b border-slate-100">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
              Create Pipeline
            </h1>
            <p className="text-slate-600 text-sm">
              Create pipelines to track workflow stages and manage progress in one place.
            </p>
          </div>

          {/* Create Options */}
          <div className="px-8 py-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Start from Blank */}
            <button
              onClick={() => openCreatePipelineModal()}
              className="group cursor-pointer  relative overflow-hidden  bg-white border-2 border-slate-200 rounded-xl p-8 text-center hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-100 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 via-indigo-50/0 to-indigo-50/0 group-hover:from-indigo-50/50 group-hover:via-indigo-50/20 group-hover:to-transparent transition-all duration-500" />
              <div className="relative">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full border-2 border-slate-300 group-hover:border-indigo-500 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-90">
                  <Plus className="w-7 h-7 text-slate-500 group-hover:text-indigo-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Start from blank
                </h3>
                <p className="text-sm text-slate-500">
                  Build your process from scratch
                </p>
              </div>
            </button>

            {/* Use Templates */}
            <button
              onClick={() => createPipeline('template')}
              className="group cursor-pointer relative overflow-hidden bg-white border-2 border-slate-200 rounded-xl p-8 text-center hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 via-emerald-50/0 to-emerald-50/0 group-hover:from-emerald-50/50 group-hover:via-emerald-50/20 group-hover:to-transparent transition-all duration-500" />
              <div className="relative">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-slate-100 group-hover:bg-emerald-50 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                  <Layout className="w-7 h-7 text-slate-500 group-hover:text-emerald-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Use pre-built Templates
                </h3>
                <p className="text-sm text-slate-500">
                  Accelerate with industry standards
                </p>
              </div>
            </button>

            {/* AI Pipeline */}
            <button
              onClick={() => createPipeline('ai')}
              className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-purple-400/50 rounded-xl p-8 text-center hover:shadow-lg hover:shadow-purple-200 transition-all duration-300 hover:-translate-y-1 hover:from-purple-600 hover:to-pink-600"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-white/10" />
              <div className="relative">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-white/30">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  Open Pipeline With AI
                </h3>
                <p className="text-sm text-purple-100">
                  Build your process from scratch
                </p>
              </div>
            </button>
          </div>

          {/* Recent Pipelines Section */}
          <div className="px-8 py-8 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Recent Your Pipelines
              </h2>
              
              {/* Search Box */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Pipeline..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Pipeline List */}
            <div className="space-y-3">
              {filteredPipelines.map((pipeline, index) => (
                <div
                  key={pipeline.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`
                    group flex items-center gap-4 p-5 bg-white border-2 rounded-xl cursor-grab
                    transition-all duration-200
                    ${draggedItem === index ? 'opacity-50 rotate-1 scale-[0.98]' : ''}
                    ${dragOverItem === index && draggedItem !== index 
                      ? 'border-indigo-400 border-dashed bg-indigo-50/50' 
                      : 'border-slate-200 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/50'
                    }
                  `}
                >
                  {/* Drag Handle */}
                  <GripVertical className="w-5 h-5 text-slate-300 group-hover:text-slate-400 flex-shrink-0 transition-colors" />

                  {/* Pipeline Icon */}
                  <div className={`
                    w-12 h-12 rounded-lg border-2 ${pipeline.iconColor}
                    flex items-center justify-center text-2xl flex-shrink-0
                    transition-transform group-hover:scale-110
                  `}>
                    {pipeline.icon}
                  </div>

                  {/* Pipeline Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 mb-1">
                      {pipeline.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Created At: {pipeline.createdAt} · Created by: {pipeline.createdBy}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editPipeline(pipeline.id);
                      }}
                      className="w-9 h-9 cursor-pointer text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    >
                      <img
  src={toAbsoluteUrl('/media/images/view-icon.png')}
  className="w-6 h-6"
  alt="view"
/>

                    </button>
                    
                  </div>
                </div>
              ))}

              {filteredPipelines.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-sm">No pipelines found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl shadow-slate-900/20 animate-[slideIn_0.3s_ease-out] max-w-sm">
          <p className="text-sm font-medium">{notification}</p>
        </div>
      )}

      
    
        </Container>
        <SidebarModal 
    isOpen={isSidebarOpen}
    onClose={() => setIsSidebarOpen(false)}
    
    width="2xl"
    
>
    <AddPipeline
        onClose={() => setIsSidebarOpen(false)}
        onSave={(data) => {
            console.log('Pipeline saved:', data);
            showNotification('Pipeline created successfully!');
            setIsSidebarOpen(false);
        }}
    />
</SidebarModal>
    </Fragment>
    
  );
};

export default CreatePipeline;