"use client";

import { useState, useEffect } from "react";

export default function Home() {
  // Login States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
 const [isRegistering, setIsRegistering] = useState(false); 
  
  // Data States
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]); // NEW: State to hold projects
  
  // Form States
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(""); // NEW: State for dropdown
  const [newProjectName, setNewProjectName] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");

  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isPro, setIsPro] = useState(false);

   // --- NEW: Check token on load (The Hydration Hook) ---
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    if (savedToken) {
      // If the token is still in memory, immediately log them in
      setIsLoggedIn(true);
      // Fetch their data so the dashboard populates instantly
      fetchData(); 
    }
  }, []);

  // Check token on loa
  // --- NEW: Sync UI with Database Status ---
  useEffect(() => {
    if (workspaces.length > 0 && activeWorkspace) {
      // Find the currently selected workspace in our data
      const selectedOrg = workspaces.find(ws => ws.id.toString() === activeWorkspace.toString());
      
      // If it exists and has is_pro set to true, turn the UI gold!
      if (selectedOrg) {
        setIsPro(selectedOrg.is_pro);
      }
    }
  }, [activeWorkspace, workspaces]);

  // NEW: Registration Function
  const handleRegister = async (e) => {
    e.preventDefault();
    const response = await fetch("http://127.0.0.1:8000/api/register/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      alert("Registration successful! You can now log in.");
      setIsRegistering(false); // Switch back to the login screen
      setPassword(""); // Clear the password field for safety
    } else {
      alert("Registration failed. That username might already exist.");
    }
  };
const handleLogin = async (e) => {
    e.preventDefault();
    const response = await fetch("http://127.0.0.1:8000/api/token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }); 


    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("access_token", data.access);
      setIsLoggedIn(true);
      fetchData(); 
    } else {
      alert("Login failed. Please check your credentials.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setIsLoggedIn(false);
    setTasks([]);
    setProjects([]);
  };

  // NEW: Fetch both Projects and Tasks
  const fetchData = async () => {
    await fetchWorkspaces();
    await fetchProjects();
    await fetchTasks();
    await fetchTeam();
  };

  const fetchWorkspaces = async () => {
    const token = localStorage.getItem("access_token");
    const response = await fetch("http://127.0.0.1:8000/api/workspaces/", {
      headers: { "Authorization": `Bearer ${token}` },
    });
    
    if (response.ok) {
      const data = await response.json();
      setWorkspaces(data);
      // Automatically select the first workspace if none is active
      if (data.length > 0 && !activeWorkspace) {
        setActiveWorkspace(data[0].id);
      }
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    
    const response = await fetch("http://127.0.0.1:8000/api/workspaces/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: newWorkspaceName }),
    });

    if (response.ok) {
      setNewWorkspaceName("");
      fetchWorkspaces(); // Refresh the dropdown list
    }
  };

  const fetchTeam = async () => {
    const token = localStorage.getItem("access_token");
    // Note: Assuming your Django backend has a standard user endpoint here
    const response = await fetch("http://127.0.0.1:8000/api/users/", {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      setTeamMembers(data); 
    }
  };
// --- NEW: Comment Functions ---
  const openTaskModal = async (task) => {
    setSelectedTask(task);
    const token = localStorage.getItem("access_token");
    
    // Fetch comments linked to this specific task
    const response = await fetch(`http://127.0.0.1:8000/api/comments/?task=${task.id}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    
    if (response.ok) {
      const data = await response.json();
      setComments(data);
    }
  };

  const closeTaskModal = () => {
    setSelectedTask(null);
    setComments([]);
    setNewComment("");
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    
    const response = await fetch("http://127.0.0.1:8000/api/comments/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: selectedTask.id,
        text: newComment // Assuming your Django model uses 'text' or 'content'
      }),
    });

    if (response.ok) {
      setNewComment("");
      openTaskModal(selectedTask); // Instantly refresh the comment thread
    } else {
      alert("Failed to post comment. Ensure your Django backend has a Comments endpoint set up!");
    }
  };
  // --- NEW: Team Management Function ---
  const handleInviteMember = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    
    // Note: Assuming your Django backend has an endpoint for tenant invites
    const response = await fetch("http://127.0.0.1:8000/api/invite/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: inviteUsername, role: inviteRole }),
    });

    if (response.ok) {
      setInviteUsername("");
      setInviteRole("Member");
      fetchTeam(); // Refresh the dropdowns and team list instantly
      alert("User successfully added to your workspace!");
    } else {
      alert("Failed to add user. Ensure they exist and are not already in the team.");
    }
  };

  

  // NEW: Function to securely fetch projects from Django
  const fetchProjects = async () => {
    const token = localStorage.getItem("access_token");
    const response = await fetch("http://127.0.0.1:8000/api/projects/", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      setProjects(data); 
      // Set the default dropdown value to the first project if one exists
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    }
  };

  const fetchTasks = async () => {
    const token = localStorage.getItem("access_token");
    const response = await fetch("http://127.0.0.1:8000/api/tasks/", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      setTasks(data); 
    } else {
      handleLogout(); 
    }
  };

  // ADD THIS FUNCTION:
  const handleCreateProject = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");

    const response = await fetch("http://127.0.0.1:8000/api/projects/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: newProjectName }),
    });

    if (response.ok) {
      setNewProjectName("");
      fetchProjects(); // Instantly update the dropdown menu
    } else {
      alert("Failed to create project.");
    }
  };
   
  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    if (!selectedProjectId) {
      alert("Please select or create a project first!");
      return;
    }
   

  const token = localStorage.getItem("access_token");

  const response = await fetch("http://127.0.0.1:8000/api/tasks/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: newTaskTitle,
        description: newTaskDesc,
        status: "TO_DO", 
        project: selectedProjectId,
        due_date: newDueDate,
        assigned_to: selectedAssignee// NEW: Send the date to Django
      }),
    });

    if (response.ok) {
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewDueDate(""); 
      setSelectedAssignee("");
      fetchTasks(); 
    }
  };

  const handleDeleteTask = async (taskId) => {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`http://127.0.0.1:8000/api/tasks/${taskId}/`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (response.ok) fetchTasks();
  };

  // --- NEW: Stripe Checkout Trigger ---
  const handleUpgrade = async () => {
    if (!activeWorkspace) return alert("Please select a workspace first!");
    
    const token = localStorage.getItem("access_token");
    
    try {
      const response = await fetch("http://127.0.0.1:8000/api/create-checkout-session/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        // We send the workspace ID so Stripe knows which tenant is upgrading
        body: JSON.stringify({ workspace_id: activeWorkspace }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect the user to the Stripe hosted checkout page
        if (data.checkout_url) {
          window.location.href = data.checkout_url; 
        } else {
          alert("Stripe session created, but no URL returned.");
        }
      } else {
        alert("Failed to initialize payment. Check your Stripe keys.");
      }
    } catch (error) {
      console.error("Stripe error:", error);
    }
  };

  const handleUpdateStatus = async (task) => {
    const token = localStorage.getItem("access_token");
    let nextStatus = "TO_DO";
    if (task.status === "TO_DO") nextStatus = "IN_PROGRESS";
    else if (task.status === "IN_PROGRESS") nextStatus = "DONE";

    const response = await fetch(`http://127.0.0.1:8000/api/tasks/${task.id}/`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        status: nextStatus,
        project: task.project 
      }),
    });

    if (response.ok) fetchTasks();
  };

  // --- UI RENDERING ---

 if (isLoggedIn) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          {/* Header */}
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            
            {/* Left Side: Workspace Switcher & Billing */}
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              
              {/* Workspace Dropdown */}
              <select 
                className="text-xl font-bold text-blue-800 bg-blue-50 border border-blue-200 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={activeWorkspace}
                onChange={(e) => setActiveWorkspace(e.target.value)}
              >
                {workspaces.length === 0 && <option value="">No Workspaces</option>}
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>
                    🏢 {ws.name}
                  </option>
                ))}
              </select>

              {/* Free Tier Badge & Stripe Upgrade Button */}
              {/* Dynamic Tier Badge & Stripe Upgrade Button */}
              <div className="flex items-center gap-2 border-l border-r border-gray-300 px-4">
                {isPro ? (
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded uppercase tracking-wide shadow-sm flex items-center gap-1">
                    <span>👑</span> Pro Tier
                  </span>
                ) : (
                  <>
                    <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                      Free Tier
                    </span>
                    <button 
                      onClick={handleUpgrade}
                      className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow hover:from-purple-600 hover:to-indigo-700 transition flex items-center gap-1"
                    >
                      <span>⚡</span> Upgrade to Pro
                    </button>
                  </>
                )}
              </div>

              {/* Create New Workspace Form */}
              <form onSubmit={handleCreateWorkspace} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Org Name..."
                  className="p-1.5 border border-gray-300 rounded text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  required
                />
                <button type="submit" className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded text-sm hover:bg-blue-200 transition">
                  + Add
                </button>
              </form>

            </div>
            
            {/* Right Side: Admin Buttons */}
            <div className="flex gap-3 w-full md:w-auto justify-end">
              <button 
                onClick={() => setIsTeamModalOpen(true)}
                className="bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded hover:bg-gray-900 transition shadow-sm"
              >
                ⚙️ Manage Team
              </button>
              <button 
                onClick={handleLogout}
                className="bg-red-500 text-white text-sm font-bold px-4 py-2 rounded hover:bg-red-600 transition shadow-sm"
              >
                Log Out
              </button>
            </div>
          </div>
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-100 flex flex-col items-center">
              <h3 className="text-blue-800 font-semibold mb-1">Total Projects</h3>
              <p className="text-3xl font-bold text-blue-600">{projects.length}</p>
            </div>
            <div className="bg-yellow-50 p-6 rounded-xl shadow-sm border border-yellow-100 flex flex-col items-center">
              <h3 className="text-yellow-800 font-semibold mb-1">Active Tasks</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {tasks.filter(t => t.status !== 'DONE').length}
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-xl shadow-sm border border-green-100 flex flex-col items-center">
              <h3 className="text-green-800 font-semibold mb-1">Completed Tasks</h3>
              <p className="text-3xl font-bold text-green-600">
                {tasks.filter(t => t.status === 'DONE').length}
              </p>
            </div>
          </div>

          {/* Control Panel Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            
            {/* Create Project Panel */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="font-bold text-lg mb-4 border-b pb-2">New Project</h2>
              <form onSubmit={handleCreateProject} className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Project Name"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  required
                />
                <button type="submit" className="bg-purple-600 text-white font-bold py-2 px-4 rounded hover:bg-purple-700 transition mt-2">
                  Create Project
                </button>
              </form>
            </div>

            {/* Create Task Panel */}
            <div className="bg-white p-6 rounded-xl shadow-md md:col-span-2">
              <h2 className="font-bold text-lg mb-4 border-b pb-2">New Task</h2>
              <form onSubmit={handleCreateTask} className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Task Title (e.g., Update Mainframe)"
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Description"
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                    />
                    <select 
                      className="w-1/4 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      required
                    >
                      {projects.length === 0 && <option value="">No projects...</option>}
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="w-1/4 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.username}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className="w-1/4 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="bg-green-600 text-white font-bold py-2 px-6 rounded hover:bg-green-700 transition w-full md:w-auto h-full mt-1 md:mt-0">
                  Add Task
                </button>
              </form>
            </div>
          </div>

          {/* Task Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => {
              const taskProject = projects.find(p => p.id === task.project);
              const assignee = teamMembers.find(m => m.id === task.assigned_to);
              
              return (
                <div key={task.id} className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-xl font-bold">{task.title}</h2>
                      <button 
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-500 hover:text-red-700 font-bold px-2 py-1 bg-red-50 rounded"
                      >
                        X
                      </button>
                    </div>
                    <p className="text-xs text-blue-600 font-bold mb-2 uppercase tracking-wide">
                      {taskProject ? taskProject.name : "Unknown Project"}
                    </p>
                    <p className="text-gray-600 mb-4 text-sm">
                      {task.description || "No description provided."}
                    </p>
                    
                    {task.due_date && (
                      <p className="text-xs text-red-500 font-semibold mb-2 bg-red-50 inline-block px-2 py-1 rounded mr-2">
                        📅 Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                    
                    {task.assigned_to && (
                      <p className="text-xs text-purple-600 font-semibold mb-2 bg-purple-50 inline-block px-2 py-1 rounded">
                        👤 {assignee ? assignee.username : "Unknown User"}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-4 border-t pt-4">
                    <span className={`inline-block text-xs px-2 py-1 rounded font-semibold tracking-wide 
                      ${task.status === 'DONE' ? 'bg-green-100 text-green-800' : 
                        task.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'}`}
                    >
                      {task.status}
                    </span>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openTaskModal(task)}
                        className="text-xs bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded hover:bg-gray-200 transition"
                      >
                        💬 Comments
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(task)}
                        className="text-xs bg-blue-50 text-blue-600 font-bold px-3 py-1 rounded hover:bg-blue-100 transition"
                      >
                        Advance ➔
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {tasks.length === 0 && (
            <p className="text-gray-500 text-center mt-8">No tasks found. Time to create one!</p>
          )}

          {/* Task Comments Modal Overlay */}
          {selectedTask && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                
                <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                  <h2 className="font-bold text-xl">{selectedTask.title}</h2>
                  <button onClick={closeTaskModal} className="font-bold text-xl hover:text-red-300">×</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                  <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Discussion</h3>
                  
                  {comments.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">No comments yet. Start the conversation!</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {comments.map(comment => (
                        <div key={comment.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                          <p className="text-xs font-bold text-blue-600 mb-1">User ID: {comment.author || "Unknown"}</p>
                          <p className="text-gray-700 text-sm">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white border-t">
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your comment..."
                      className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      required
                    />
                    <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700 transition">
                      Post
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}
         {/* NEW: Team Management Modal Overlay */}
          {isTeamModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                
                <div className="bg-gray-800 p-4 flex justify-between items-center text-white">
                  <h2 className="font-bold text-xl">Workspace Settings</h2>
                  <button onClick={() => setIsTeamModalOpen(false)} className="font-bold text-xl hover:text-gray-300">×</button>
                </div>

                <div className="p-6 bg-gray-50 flex-1">
                  <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Active Team Members</h3>
                  <div className="flex flex-col gap-2 mb-6">
                    {teamMembers.length === 0 ? (
                      <p className="text-sm text-gray-500">You are the only member.</p>
                    ) : (
                      teamMembers.map(member => (
                        <div key={member.id} className="flex justify-between items-center bg-white p-3 rounded border border-gray-200">
                          <span className="font-semibold text-gray-800">👤 {member.username}</span>
                          {/* Display role if your backend provides it, otherwise default to Member badge */}
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">
                            {member.role || "Member"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Invite New User</h3>
                  <form onSubmit={handleInviteMember} className="flex flex-col gap-3">
                    <input
                      type="text"
                      placeholder="Enter exact username..."
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      required
                    />
                    <select
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      <option value="Member">Member (Can edit tasks)</option>
                      <option value="Admin">Admin (Can manage team)</option>
                    </select>
                    <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition mt-2">
                      Send Invite
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )} 
        </div>
      </main>
    );
  }

  // --- AUTHENTICATION SCREEN ---
  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-blue-600 mb-2 text-center">Task Tracker Pro</h1>
        <p className="text-center text-gray-500 mb-6">
          {isRegistering ? "Create your workspace account" : "Welcome back, please log in"}
        </p>
        
        {/* Dynamic Form: Uses handleRegister if toggled, otherwise handleLogin */}
        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            className="p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition shadow-md">
            {isRegistering ? "Sign Up" : "Log In"}
          </button>
        </form>

        {/* Toggle Button */}
        <div className="mt-6 text-center border-t pt-4">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-blue-600 hover:underline font-semibold"
          >
            {isRegistering ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </main>
  );
}