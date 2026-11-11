
import { useState, useRef, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import Login from "./Login";
import {
  Cloud,
  LayoutDashboard,
  Folder,
  Image,
  Video,
  FileText,
  Trash2,
  Settings,
  Search,
  Bell,
  Upload,
  MoreHorizontal,
  HardDrive,
  ChevronRight,
  Menu,
  Download,
  File,
  FolderPlus,
  X,
  Pencil,
  Eye,
} from "lucide-react";

import "./App.css";

const initialFiles = [
  {
    id: 1,
    name: "Brand Identity.png",
    type: "image",
    size: "2.4 MB",
    date: "Today",
    folderId: 3,
  },
  {
    id: 2,
    name: "Project Presentation.pdf",
    type: "document",
    size: "4.8 MB",
    date: "Yesterday",
    folderId: 2,
  },
  {
    id: 3,
    name: "Product Video.mp4",
    type: "video",
    size: "128 MB",
    date: "Yesterday",
    folderId: 2,
  },
  {
    id: 4,
    name: "Website Design.jpg",
    type: "image",
    size: "3.2 MB",
    date: "Oct 30",
    folderId: 3,
  },
  {
    id: 5,
    name: "Project Notes.docx",
    type: "document",
    size: "820 KB",
    date: "Oct 29",
    folderId: 4,
  },
];

const initialFolders = [
  { id: 1, name: "Personal", count: 12, color: "blue" },
  { id: 2, name: "Work Projects", count: 24, color: "purple" },
  { id: 3, name: "Photos", count: 48, color: "orange" },
  { id: 4, name: "Documents", count: 16, color: "green" },
];

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "My Files", icon: Folder },
  { name: "Folders", icon: FolderPlus },
  { name: "Photos", icon: Image },
  { name: "Videos", icon: Video },
  { name: "Documents", icon: FileText },
  { name: "Trash", icon: Trash2 },
];

function App() {
  const [authToken, setAuthToken] = useState(
  () => localStorage.getItem("cloudspace_token")
  );

  const handleLogin = (token) => {
  setAuthToken(token);
  };
  const [activePage, setActivePage] = useState("Dashboard");
  const [files, setFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [mobileMenu, setMobileMenu] = useState(false);
  const usedStorage = files.reduce((total, file) => {
  return total + (file.sizeInBytes || 0);
  }, 0) / (1024 * 1024 * 1024);
  const fileInput = useRef(null);

  // BACKEND CONNECTION
const API_URL = Capacitor.isNativePlatform()
  ? "http://10.0.2.2:8000"
  : "http://127.0.0.1:8000";
// FETCH FILES AND FOLDERS FROM DATABASE

useEffect(() => {
  const fetchData = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${authToken}`,
      };

      const [
        filesResponse,
        foldersResponse,
        trashResponse
      ] = await Promise.all([
        fetch(`${API_URL}/files/`, { headers }),
        fetch(`${API_URL}/folders/`, { headers }),
        fetch(`${API_URL}/files/trash`, { headers })
      ]);

      // Keep the rest of your existing code here

      if (
        !filesResponse.ok ||
        !foldersResponse.ok ||
        !trashResponse.ok
      ) {
        throw new Error("Failed to fetch data");
      }

      const filesData = await filesResponse.json();
      const foldersData = await foldersResponse.json();
      const trashData = await trashResponse.json();

      // Combine active files and deleted files
      const allFilesData = [
        ...filesData,
        ...trashData
      ];

      // Convert backend file data into frontend format
      const formattedFiles = allFilesData.map((file) => {
        let type = "other";

        if (file.file_type?.startsWith("image/")) {
          type = "image";
        } else if (file.file_type?.startsWith("video/")) {
          type = "video";
        } else if (
          file.file_type?.includes("pdf") ||
          file.file_type?.includes("document") ||
          file.file_type?.includes("text")
        ) {
          type = "document";
        }

        return {
          id: file.id,
          name: file.name,
          type: type,
          size: formatSize(file.size),
          sizeInBytes: file.size,
          date: file.created_at
            ? new Date(file.created_at).toLocaleDateString()
            : "Recently",
          createdAt: file.created_at,
          folderId: file.folder_id,
          deleted: file.is_deleted,
          fileType: file.file_type
        };
      });

      const formattedFolders = foldersData.map((folder, index) => ({
        id: folder.id,
        name: folder.name,
        color: ["blue", "purple", "orange", "green"][index % 4]
      }));

      setFiles(formattedFiles);
      setFolders(formattedFolders);

    } catch (error) {
      console.error("Backend connection error:", error);
      alert("Could not connect to CloudSpace backend.");
    }
  };


  fetchData();
}, [authToken]);

  // FILTER FILES ACCORDING TO PAGE AND SEARCH
  const visibleFiles = files.filter((file) => {
    const matchesSearch = file.name
      .toLowerCase()
      .includes(search.toLowerCase());

    let matchesPage = true;

    if (activePage === "Photos") {
      matchesPage = file.type === "image";
    }

    if (activePage === "Videos") {
      matchesPage = file.type === "video";
    }

    if (activePage === "Documents") {
      matchesPage = file.type === "document";
    }

    if (activePage === "Trash") {
      matchesPage = file.deleted === true;
    } else if (file.deleted) {
      matchesPage = false;
    }

    if (activePage === "Folders") {
      matchesPage =
        selectedFolderId !== null &&
        file.folderId === selectedFolderId;
    }

    return matchesSearch && matchesPage;
  });

  const sortedFiles = [...visibleFiles].sort((a, b) => {
  switch (sortOption) {
    case "name-az":
      return a.name.localeCompare(b.name);

    case "name-za":
      return b.name.localeCompare(a.name);

    case "size-small":
      return a.sizeInBytes - b.sizeInBytes;

    case "size-large":
      return b.sizeInBytes - a.sizeInBytes;

    case "type":
      return a.type.localeCompare(b.type);

    case "oldest":
      return new Date(a.createdAt) - new Date(b.createdAt);

    case "newest":
    default:
      return new Date(b.createdAt) - new Date(a.createdAt);
  }
  });

// SELECT OR DESELECT FILE
const toggleFileSelection = (fileId) => {
  setSelectedFileIds((previous) =>
    previous.includes(fileId)
      ? previous.filter((id) => id !== fileId)
      : [...previous, fileId]
  );
};

// START SELECTION MODE
const startSelection = () => {
  setSelectionMode(true);
};

// SELECT ALL VISIBLE FILES
const selectAllFiles = () => {
  const activeFileIds = visibleFiles
    .filter((file) => !file.deleted)
    .map((file) => file.id);

  setSelectedFileIds(activeFileIds);
};

// CANCEL SELECTION
const clearSelection = () => {
  setSelectedFileIds([]);
  setSelectionMode(false);
};
  // FORMAT FILE SIZE
  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

 
// UPLOAD FILES TO BACKEND
const handleUpload = async (event) => {
  const selectedFiles = Array.from(event.target.files || []);

  if (selectedFiles.length === 0) return;

  try {
    for (const file of selectedFiles) {
      const formData = new FormData();

      formData.append("file", file);

      // Upload inside the currently opened folder
      if (activePage === "Folders" && selectedFolderId !== null) {
        formData.append("folder_id", selectedFolderId);
      }

      const response = await fetch(`${API_URL}/files/upload`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed for ${file.name}`);
      }
    }

    // Fetch updated files from the backend
    const filesResponse = await fetch(`${API_URL}/files/`);

    if (!filesResponse.ok) {
      throw new Error("Could not refresh files");
    }

    const filesData = await filesResponse.json();

   const formattedFiles = filesData.map((file) => {
  let type = "other";

  if (file.file_type?.startsWith("image/")) {
    type = "image";
  } else if (file.file_type?.startsWith("video/")) {
    type = "video";
  } else if (
    file.file_type?.includes("pdf") ||
    file.file_type?.includes("document") ||
    file.file_type?.includes("text")
  ) {
    type = "document";
  }

 return {
  id: file.id,
  name: file.name,
  type,
  size: formatSize(file.size),
  sizeInBytes: file.size,
  date: file.created_at
    ? new Date(file.created_at).toLocaleDateString()
    : "Recently",
  createdAt: file.created_at,
  folderId: file.folder_id,
  deleted: file.is_deleted,
  fileType: file.file_type
};
});

setFiles(formattedFiles);

alert("Files uploaded successfully!");

} catch (error) {
  console.error("Upload error:", error);
  alert(error.message || "File upload failed.");
}

  event.target.value = "";
};


  // CREATE NEW FOLDER

// CREATE NEW FOLDER
const createFolder = async () => {
  const name = window.prompt("Enter your new folder name:");

  if (!name || !name.trim()) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/folders/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error("Could not create folder.");
    }

    const newFolder = await response.json();

    setFolders((previous) => [
      ...previous,
      {
        id: newFolder.id,
        name: newFolder.name,
        count: 0,
        color: "blue",
      },
    ]);

    alert("Folder created successfully!");

  } catch (error) {
    console.error("Folder creation error:", error);
    alert(error.message);
  }
};

  // RENAME FILE
 
  const renameFile = async (id) => {
  const fileToRename = files.find((file) => file.id === id);

  if (!fileToRename) return;

  const newName = window.prompt(
    "Enter a new file name:",
    fileToRename.name
  );

  if (newName === null) return;

  const trimmedName = newName.trim();

  if (!trimmedName) {
    alert("File name cannot be empty.");
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/files/rename/${id}?new_name=${encodeURIComponent(trimmedName)}`,
      {
        method: "PUT"
      }
    );

    if (!response.ok) {
      throw new Error("Could not rename file.");
    }

    setFiles((previous) =>
      previous.map((file) =>
        file.id === id
          ? { ...file, name: trimmedName }
          : file
      )
    );

    alert("File renamed successfully!");

  } catch (error) {
    console.error("Rename error:", error);
    alert(error.message);
  }
};


  // MOVE FILE INTO A FOLDER OR MAIN WORKSPACE
  
  const moveFile = async (id) => {
  const folderList = folders
    .map((folder, index) => `${index + 1}. ${folder.name}`)
    .join("\n");

  const choice = window.prompt(
    `Choose a destination by entering its number:

0. Main workspace (no folder)
${folderList}`
  );

  if (choice === null) return;

  const destination = Number(choice);

  if (
    choice.trim() === "" ||
    !Number.isInteger(destination) ||
    destination < 0 ||
    destination > folders.length
  ) {
    alert("Invalid folder selection.");
    return;
  }

  const selectedFolder =
    destination === 0 ? null : folders[destination - 1];

  try {
    const formData = new FormData();

    if (selectedFolder) {
      formData.append("folder_id", selectedFolder.id);
    }

    const response = await fetch(
      `${API_URL}/files/move/${id}`,
      {
        method: "PUT",
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error("Could not move file.");
    }

    setFiles((previous) =>
      previous.map((file) =>
        file.id === id
          ? {
              ...file,
              folderId: selectedFolder ? selectedFolder.id : null
            }
          : file
      )
    );

    alert(
      selectedFolder
        ? `File moved to ${selectedFolder.name}!`
        : "File moved to the main workspace!"
    );

  } catch (error) {
    console.error("Move error:", error);
    alert(error.message);
  }
};


  //DELETE FILE

const deleteFile = async (id) => {
  try {
    const response = await fetch(`${API_URL}/files/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Could not delete file.");
    }

    setFiles((previous) =>
      previous.map((file) =>
        file.id === id
          ? { ...file, deleted: true }
          : file
      )
    );

    alert("File moved to Trash!");

  } catch (error) {
    console.error("Delete error:", error);
    alert(error.message);
  }
};
  //DELETE SELECTED FILES
  const bulkDeleteFiles = async () => {
    if (selectedFileIds.length === 0) {
      alert("Please select at least one file.");
      return;
    }

    const confirmDelete = window.confirm(
      `Move ${selectedFileIds.length} selected file(s) to Trash?`
    );

  if (!confirmDelete) return;

  try {
    await Promise.all(
      selectedFileIds.map((id) =>
        fetch(`${API_URL}/files/${id}`, {
          method: "DELETE",
        }).then((response) => {
          if (!response.ok) {
            throw new Error("Some files could not be deleted.");
          }
        })
      )
    );

    setFiles((previous) =>
      previous.map((file) =>
        selectedFileIds.includes(file.id)
          ? { ...file, deleted: true }
          : file
      )
    );

  setSelectedFileIds([]);
  setSelectionMode(false);

  alert("Selected files moved to Trash!");

  } catch (error) {
    alert(error.message);
  }
};
// DOWNLOAD SELECTED FILES
const bulkDownloadFiles = () => {
  if (selectedFileIds.length === 0) {
    alert("Please select at least one file.");
    return;
  }

  const selectedFiles = files.filter(
    (file) =>
      selectedFileIds.includes(file.id) &&
      !file.deleted
  );

  selectedFiles.forEach((file, index) => {
    setTimeout(() => {
      downloadFile(file);
    }, index * 700);
  });
};

// MOVE SELECTED FILES
const bulkMoveFiles = async () => {
  if (selectedFileIds.length === 0) {
    alert("Please select at least one file.");
    return;
  }

  const folderList = folders
    .map((folder, index) => `${index + 1}. ${folder.name}`)
    .join("\n");

  const choice = window.prompt(
    `Choose a destination by entering its number:

0. Main workspace (no folder)
${folderList}`
  );

  if (choice === null) return;

  const destination = Number(choice);

  if (
    choice.trim() === "" ||
    !Number.isInteger(destination) ||
    destination < 0 ||
    destination > folders.length
  ) {
    alert("Invalid folder selection.");
    return;
  }

  const selectedFolder =
    destination === 0 ? null : folders[destination - 1];

  const idsToMove = [...selectedFileIds];

  const destinationName = selectedFolder
    ? selectedFolder.name
    : "Main workspace";

  const confirmMove = window.confirm(
    `Move ${idsToMove.length} selected file(s) to ${destinationName}?`
  );

  if (!confirmMove) return;

  try {
    const results = await Promise.all(
      idsToMove.map(async (id) => {
        try {
          const formData = new FormData();

          if (selectedFolder) {
            formData.append("folder_id", selectedFolder.id);
          }

          const response = await fetch(
            `${API_URL}/files/move/${id}`,
            {
              method: "PUT",
              body: formData
            }
          );

          if (!response.ok) {
            return { id, success: false };
          }

          return { id, success: true };

        } catch (error) {
          console.error(`Could not move file ${id}:`, error);
          return { id, success: false };
        }
      })
    );

    const successfulIds = results
      .filter((result) => result.success)
      .map((result) => result.id);

    const failedIds = results
      .filter((result) => !result.success)
      .map((result) => result.id);

    // Update only files successfully moved by the backend
    setFiles((previous) =>
      previous.map((file) =>
        successfulIds.includes(file.id)
          ? {
              ...file,
              folderId: selectedFolder ? selectedFolder.id : null
            }
          : file
      )
    );

    if (failedIds.length === 0) {
      setSelectedFileIds([]);
      setSelectionMode(false);

      alert(
        `${successfulIds.length} file(s) moved to ${destinationName} successfully!`
      );
    } else {
      // Keep failed files selected so they can be retried
      setSelectedFileIds(failedIds);

      alert(
        `${successfulIds.length} file(s) moved successfully.\n` +
        `${failedIds.length} file(s) could not be moved.\n\n` +
        "The failed files remain selected."
      );
    }

  } catch (error) {
    console.error("Bulk move error:", error);
    alert("Something went wrong while moving the selected files.");
  }
};


  // RESTORE FILE

const restoreFile = async (id) => {
  try {
    const response = await fetch(`${API_URL}/files/restore/${id}`, {
      method: "PUT"
    });

    if (!response.ok) {
      throw new Error("Could not restore file.");
    }

    setFiles((previous) =>
      previous.map((file) =>
        file.id === id
          ? { ...file, deleted: false }
          : file
      )
    );

    alert("File restored successfully!");

  } catch (error) {
    console.error("Restore error:", error);
    alert(error.message);
  }
};

  // PREVIEW IMAGE AND PDF

const openPreview = async (file) => {
  if (
    file.fileType !== "application/pdf" &&
    !file.fileType?.startsWith("image/")
  ) {
    alert("Preview is available for images and PDFs only.");
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/files/download/${file.id}`
    );

    if (!response.ok) {
      throw new Error("Could not load file preview.");
    }

    const blob = await response.blob();
    const previewUrl = URL.createObjectURL(blob);

    setPreviewFile({
      ...file,
      url: previewUrl
    });

  } catch (error) {
    console.error("Preview error:", error);
    alert(error.message);
  }
};

  
  // DOWNLOAD FILE FROM BACKEND
  const downloadFile = (file) => {
    if (!file.id) {
      alert("File not found.");
      return;
    }

    const downloadUrl = `${API_URL}/files/download/${file.id}`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = file.name;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // FILE ICON
  const getFileIcon = (type) => {
    if (type === "image") return <Image />;
    if (type === "video") return <Video />;
    if (type === "document") return <FileText />;

    return <File />;
  };

  const selectedFolder = folders.find(
    (folder) => folder.id === selectedFolderId
  );

  const pageTitle =
    activePage === "Dashboard"
      ? "Overview"
      : activePage === "Folders" && selectedFolder
      ? selectedFolder.name
      : activePage;

  if (!authToken) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">

      {/* SIDEBAR */}
      <aside
        className={`sidebar ${
          mobileMenu ? "sidebar-open" : ""
        }`}
      >
        <div className="brand">
          <div className="brand-icon">
            <Cloud size={25} />
          </div>

          <span>
            Cloud
            <span className="brand-highlight">
              Space
            </span>
          </span>

          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-label">
          WORKSPACE
        </div>

        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => {
                  setActivePage(item.name);
                  setSelectedFolderId(null);
                  setMobileMenu(false);
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">

          {/* STORAGE CARD */}
          <div className="storage-card">
            <div className="storage-icon">
              <HardDrive size={19} />
            </div>

            <div className="storage-heading">
              <span>Storage</span>

              <span>
                {Math.min(usedStorage, 15).toFixed(1)} / 15 GB
              </span>
            </div>

            <div className="storage-progress">
              <div
                style={{
                  width: `${
                    Math.min(
                      (usedStorage / 15) * 100,
                      100
                    )
                  }%`,
                }}
              />
            </div>

            <p>Actual uploaded storage</p>          </div>

          {/* SETTINGS */}
          <button
            className="nav-item settings-button"
            onClick={() => setActivePage("Settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          {/* PROFILE */}
          <div className="profile">
            <div className="avatar">K</div>

            <div className="profile-info">
              <strong>My Account</strong>
              <span>Personal workspace</span>
            </div>

            <MoreHorizontal size={20} />
          </div>

        </div>
      </aside>

      {mobileMenu && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
        />
      )}

      {/* MAIN CONTENT */}
      <main className="main-content">

        {/* TOPBAR */}
        <header className="topbar">

          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenu(true)}
          >
            <Menu size={22} />
          </button>

          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={15} />
            <strong>{pageTitle}</strong>
          </div>

          <div className="topbar-actions">

            {/* SEARCH */}
            <div className="search-box">
              <Search size={18} />

              <input
                type="text"
                placeholder="Search your files..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <span className="search-shortcut">
                ⌘ K
              </span>
            </div>

            <button
              className="notification-button"
              aria-label="Notifications"
            >
              <Bell size={19} />
              <span />
            </button>

          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="page-content">

          {/* WELCOME SECTION */}
          <section className="welcome-section">

            <div>
              <p className="eyebrow">
                YOUR PERSONAL CLOUD
              </p>

              <h1>
                {activePage === "Dashboard"
                  ? "Good to see you again."
                  : activePage === "Settings"
                  ? "Settings"
                  : activePage}
              </h1>

              <p className="welcome-subtitle">
                Everything you need, all in one place.
              </p>
            </div>

            <div className="welcome-actions">

              <button
                className="secondary-button"
                onClick={createFolder}
              >
                <FolderPlus size={17} />
                New Folder
              </button>

              <button
                className="primary-button"
                onClick={() =>
                  fileInput.current?.click()
                }
              >
                <Upload size={17} />
                Upload Files
              </button>

              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                onChange={handleUpload}
              />

            </div>
          </section>

          {activePage === "Settings" ? (
            <section className="empty-state">
              <Settings size={36} />
              <h2>Settings</h2>

              <p>
                Account preferences and security settings
                will be added later.
              </p>
            </section>
          ) : (
            <>

              {/* STORAGE OVERVIEW */}
              {activePage === "Dashboard" && (
                <section className="overview-grid">

                  {/* STORAGE */}
                  <div className="overview-card storage-overview">

                    <div className="overview-top">
                      <div>
                        <p className="card-label">
                          TOTAL STORAGE USED
                        </p>

                        <h2>
                          {usedStorage.toFixed(2)}
                          <span> GB</span>
                        </h2>
                      </div>

                      <div className="overview-icon blue-icon">
                        <HardDrive size={22} />
                      </div>
                    </div>

                    <div className="overview-bottom">
                      <div className="overview-track">
                        <div
                          style={{
                            width: `${
                              Math.min(
                                (usedStorage / 15) * 100,
                                100
                              )
                            }%`,
                          }}
                        />
                      </div>

                      <span>Of 15 GB storage capacity</span>
                    </div>
                  </div>

                  {/* TOTAL FILES */}
                  <div className="overview-card">
                    <div className="overview-top">

                      <div>
                        <p className="card-label">
                          TOTAL FILES
                        </p>

                        <h2>
                          {
                            files.filter(
                              (file) => !file.deleted
                            ).length
                          }
                        </h2>
                      </div>

                      <div className="overview-icon purple-icon">
                        <File size={22} />
                      </div>

                    </div>

                    <div className="overview-bottom">
                      <span>
                        Files in your workspace
                      </span>
                    </div>
                  </div>

                  {/* TOTAL FOLDERS */}
                  <div className="overview-card">
                    <div className="overview-top">

                      <div>
                        <p className="card-label">
                          TOTAL FOLDERS
                        </p>

                        <h2>{folders.length}</h2>
                      </div>

                      <div className="overview-icon orange-icon">
                        <Folder size={22} />
                      </div>

                    </div>

                    <div className="overview-bottom">
                      <span>
                        Your organised collections
                      </span>
                    </div>
                  </div>

                </section>
              )}

              {/* DASHBOARD FOLDERS */}
              {activePage === "Dashboard" && (
                <section className="content-section">

                  <div className="section-heading">

                    <div>
                      <h2>Folders</h2>
                      <p>
                        Organise your files your way.
                      </p>
                    </div>

                    <button
                      className="text-button"
                      onClick={createFolder}
                    >
                      View / Create
                      <ChevronRight size={16} />
                    </button>

                  </div>

                  <div className="folder-grid">

                    {folders.map((folder) => (
                      <div
                        className="folder-card"
                        key={folder.id}
                        onClick={() => {
                          setSelectedFolderId(folder.id);
                          setActivePage("Folders");
                        }}
                      >

                        <div
                          className={`folder-icon ${folder.color}`}
                        >
                          <Folder
                            size={24}
                            fill="currentColor"
                          />
                        </div>

                        <div className="folder-details">
                          <strong>{folder.name}</strong>

                          <span>
                            {
                              files.filter(
                                (file) =>
                                  !file.deleted &&
                                  file.folderId === folder.id
                              ).length
                            } items
                          </span>
                        </div>

                        <MoreHorizontal
                          size={19}
                          className="folder-more"
                        />

                      </div>
                    ))}

                  </div>
                </section>
              )}

              {/* DEDICATED FOLDERS PAGE */}
              {activePage === "Folders" && (
                <section className="content-section">

                  <div className="section-heading">

                    <div>
                      <h2>
                        {selectedFolder
                          ? selectedFolder.name
                          : "All Folders"}
                      </h2>

                      <p>
                        {selectedFolder
                          ? "Files saved inside this folder."
                          : "Choose a folder to view and manage its files."}
                      </p>
                    </div>

                    {selectedFolder ? (
                      <button
                        className="text-button"
                        onClick={() =>
                          setSelectedFolderId(null)
                        }
                      >
                        <ChevronRight
                          size={16}
                          style={{
                            transform: "rotate(180deg)",
                          }}
                        />
                        All folders
                      </button>
                    ) : (
                      <button
                        className="text-button"
                        onClick={createFolder}
                      >
                        <FolderPlus size={16} />
                        New folder
                      </button>
                    )}

                  </div>

                  {/* ALL FOLDER CARDS */}
                  {!selectedFolder && (
                    <div className="folder-grid">

                      {folders.map((folder) => (
                        <div
                          className="folder-card"
                          key={folder.id}
                          onClick={() =>
                            setSelectedFolderId(folder.id)
                          }
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" ||
                              event.key === " "
                            ) {
                              setSelectedFolderId(folder.id);
                            }
                          }}
                        >

                          <div
                            className={`folder-icon ${folder.color}`}
                          >
                            <Folder
                              size={24}
                              fill="currentColor"
                            />
                          </div>

                          <div className="folder-details">
                            <strong>{folder.name}</strong>

                            <span>
                              {
                                files.filter(
                                  (file) =>
                                    !file.deleted &&
                                    file.folderId === folder.id
                                ).length
                              } items
                            </span>
                          </div>

                          <MoreHorizontal
                            size={19}
                            className="folder-more"
                          />

                        </div>
                      ))}

                    </div>
                  )}

                </section>
              )}

              {/* FILES SECTION */}
              {!(
                activePage === "Folders" &&
                !selectedFolder
              ) && (
                <section className="content-section recent-section">

              <div className="section-heading">

                <div>
                  <h2>
                    {activePage === "Dashboard"
                      ? "Recent Files"
                      : activePage === "Trash"
                      ? "Deleted Files"
                      : "Your Files"}
                  </h2>

                  <p>
                    {activePage === "Dashboard"
                      ? "Your recently accessed files."
                      : "Manage your uploaded files."}
                  </p>
                </div>

                <div className="file-heading-actions">

                  <select
                    className="sort-select"
                    value={sortOption}
                    onChange={(event) => setSortOption(event.target.value)}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name-az">Name (A–Z)</option>
                    <option value="name-za">Name (Z–A)</option>
                    <option value="size-small">Smallest First</option>
                    <option value="size-large">Largest First</option>
                    <option value="type">File Type</option>
                  </select>

                  {activePage === "Dashboard" && (
                    <button
                      className="text-button"
                      onClick={() => setActivePage("My Files")}
                    >
                      View all
                      <ChevronRight size={16} />
                    </button>
                  )}

                </div>

              </div>

                  <div className="file-table">

                  {/* BULK SELECTION TOOLBAR */}

                  {activePage !== "Trash" && visibleFiles.length > 0 && (

                    <div className="bulk-toolbar">

                      {!selectionMode ? (

                        <button
                          className="select-files-button"
                          onClick={startSelection}
                        >
                          Select Files
                        </button>

                      ) : (

                        <>
                          <button onClick={selectAllFiles}>
                            Select All
                          </button>

                          <button onClick={clearSelection}>
                            Cancel Selection
                          </button>

                          <span>
                            {selectedFileIds.length} selected
                          </span>
                          <button
                            onClick={bulkDownloadFiles}
                            disabled={selectedFileIds.length === 0}
                            style={{
                              opacity: selectedFileIds.length === 0 ? 0.5 : 1,
                              cursor: selectedFileIds.length === 0
                                ? "not-allowed"
                                : "pointer"
                            }}
                          >
                            <Download size={15} />
                            Download Selected
                          </button>
                          
                          <button
                            onClick={bulkMoveFiles}
                            disabled={selectedFileIds.length === 0}
                            style={{
                              opacity: selectedFileIds.length === 0 ? 0.5 : 1,
                              cursor: selectedFileIds.length === 0
                                ? "not-allowed"
                                : "pointer"
                            }}
                          >
                            <Folder size={15} />
                            Move Selected
                          </button>

                          <button
                            onClick={bulkDeleteFiles}
                            disabled={selectedFileIds.length === 0}
                            style={{
                              color: "#ff6b6b",
                              opacity: selectedFileIds.length === 0 ? 0.5 : 1,
                              cursor: selectedFileIds.length === 0
                                ? "not-allowed"
                                : "pointer"
                            }}
                          >
                            Delete Selected
                          </button>
                        </>

                      )}

                     </div>

                    )}

                    {/* TABLE HEADER */}
                    <div className="file-table-header">
                      <span>NAME</span>
                      <span>SIZE</span>
                      <span>MODIFIED</span>
                      <span>ACTIONS</span>
                    </div>

                    {/* EMPTY STATE */}
                    {visibleFiles.length === 0 ? (
                      <div className="empty-files">
                        <Folder size={35} />

                        <h3>No files found</h3>

                        <p>
                          Upload a file or try a different search.
                        </p>
                      </div>
                    ) : (
                      sortedFiles.map((file) => (
                        <div
                          className="file-row"
                          key={file.id}
                        >

                          {/* FILE NAME */}
                          <div className="file-name">

                              {selectionMode && !file.deleted && activePage !== "Trash" && (
                                <input
                                  type="checkbox"
                                  checked={selectedFileIds.includes(file.id)}
                                  onChange={() => toggleFileSelection(file.id)}
                                  style={{
                                    width: "16px",
                                    height: "16px",
                                    cursor: "pointer",
                                    marginRight: "10px"
                                  }}
                                />
                              )}

                              <div
                                className={`file-type-icon ${file.type}`}
                              >
                              {getFileIcon(file.type)}
                            </div>

                            <span
                              onClick={() => openPreview(file)}
                              title="Click to preview"
                              style={{
                                cursor: "pointer"
                              }}
                            >
                              {file.name}

                              {file.folderId && (
                                <small
                                  style={{
                                    display: "block",
                                    fontSize: "11px",
                                    color: "#9299aa",
                                    marginTop: "4px",
                                  }}
                                >
                                  {
                                    folders.find(
                                      (folder) =>
                                        folder.id === file.folderId
                                    )?.name
                                  }
                                </small>
                              )}
                            </span>

                          </div>

                          <span className="file-meta">
                            {file.size}
                          </span>

                          <span className="file-meta">
                            {file.date}
                          </span>

                          {/* FILE ACTIONS */}
                          <div className="file-actions">

                            {file.deleted ? (
                              <button
                                title="Restore file"
                                onClick={() =>
                                  restoreFile(file.id)
                                }
                              >
                                <Folder size={17} />
                              </button>
                            ) : (
                              <>

                                {/* RENAME */}
                                <button
                                  title="Rename file"
                                  onClick={() =>
                                    renameFile(file.id)
                                  }
                                >
                                  <Pencil size={17} />
                                </button>

                                {/* MOVE */}
                                <button
                                  title="Move to folder"
                                  onClick={() =>
                                    moveFile(file.id)
                                  }
                                >
                                  <FolderPlus size={17} />
                                </button>

                                {/* PREVIEW */}
                                <button
                                  title="Preview file"
                                  onClick={() =>
                                    openPreview(file)
                                  }
                                >
                                  <Eye size={17} />
                                </button>

                                {/* DOWNLOAD */}
                                <button
                                  title="Download"
                                  onClick={() =>
                                    downloadFile(file)
                                  }
                                >
                                  <Download size={17} />
                                </button>

                                {/* DELETE */}
                                <button
                                  title="Move to trash"
                                  onClick={() =>
                                    deleteFile(file.id)
                                  }
                                >
                                  <Trash2 size={17} />
                                </button>

                              </>
                            )}

                          </div>
                        </div>
                      ))
                    )}

                  </div>
                </section>
              )}

            </>
          )}

          {/* FILE PREVIEW MODAL */}
          {previewFile && (
            <div
              className="preview-overlay"
              onClick={() => setPreviewFile(null)}
            >

              <div
                className="preview-modal"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >

                <div className="preview-header">

                  <div>
                    <h3>{previewFile.name}</h3>
                    <p>File Preview</p>
                  </div>

                  <button
                    className="preview-close"
                    onClick={() => setPreviewFile(null)}
                    title="Close preview"
                  >
                    <X size={21} />
                  </button>

                </div>

                <div className="preview-content">

                {previewFile.fileType?.startsWith("image/") ? (
                    <img
                      src={previewFile.url}
                      alt={previewFile.name}
                    />
                  ) : (
                    <iframe
                      src={previewFile.url}
                      title={previewFile.name}
                    />
                  )}

                </div>
              </div>
            </div>
          )}

          {/* FOOTER */}
          <footer className="footer">
            <span>© 2026 CloudSpace</span>
            <span>
              Personal Cloud Workspace · Prototype
            </span>
          </footer>

        </div>
      </main>
    </div>
  );
}

export default App;
