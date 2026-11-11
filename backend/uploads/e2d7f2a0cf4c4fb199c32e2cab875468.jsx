import { useState, useRef } from "react";
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
  Plus,
  Upload,
  MoreHorizontal,
  HardDrive,
  ChevronRight,
  Menu,
  Download,
  File,
  FolderPlus,
  Clock3,
  X,
  Pencil,
  Eye,
} from "lucide-react";

import "./App.css";

const initialFiles = [
  { id: 1, name: "Brand Identity.png", type: "image", size: "2.4 MB", date: "Today", folderId: 3 },
  { id: 2, name: "Project Presentation.pdf", type: "document", size: "4.8 MB", date: "Yesterday", folderId: 2 },
  { id: 3, name: "Product Video.mp4", type: "video", size: "128 MB", date: "Yesterday", folderId: 2 },
  { id: 4, name: "Website Design.jpg", type: "image", size: "3.2 MB", date: "Oct 30", folderId: 3 },
  { id: 5, name: "Project Notes.docx", type: "document", size: "820 KB", date: "Oct 29", folderId: 4 },
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
  const [activePage, setActivePage] = useState("Dashboard");
  const [files, setFiles] = useState(initialFiles);
  const [previewFile, setPreviewFile] = useState(null);
  const [folders, setFolders] = useState(initialFolders);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [usedStorage, setUsedStorage] = useState(2.4);
  const fileInput = useRef(null);

  const visibleFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(search.toLowerCase());

    let matchesPage = true;

    if (activePage === "Photos") matchesPage = file.type === "image";
    if (activePage === "Videos") matchesPage = file.type === "video";
    if (activePage === "Documents") matchesPage = file.type === "document";
    if (activePage === "Trash") matchesPage = file.deleted === true;
    else if (file.deleted) matchesPage = false;
    if (activePage === "Folders") {
      matchesPage = selectedFolderId !== null && file.folderId === selectedFolderId;
    }

    return matchesSearch && matchesPage;
  });

  const handleUpload = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    const newFiles = selectedFiles.map((file) => {
      let type = "other";

      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("video/")) type = "video";
      else if (
        file.type.includes("pdf") ||
        file.type.includes("document") ||
        file.type.includes("text")
      ) type = "document";

      return {
        id: Date.now() + Math.random(),
        name: file.name,
        type,
        size: formatSize(file.size),
        date: "Just now",
        originalFile: file,
        url: URL.createObjectURL(file),
      };
    });

    setFiles((previous) => [...newFiles, ...previous]);

    const totalMB = selectedFiles.reduce((total, file) => total + file.size, 0) / (1024 * 1024);
    setUsedStorage((previous) => previous + totalMB / 1024);

    event.target.value = "";
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const createFolder = () => {
    const name = window.prompt("Enter your new folder name:");

    if (name && name.trim()) {
      setFolders((previous) => [
        ...previous,
        {
          id: Date.now(),
          name: name.trim(),
          count: 0,
          color: "blue",
        },
      ]);
    }
  };

  const renameFile = (id) => {
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

  setFiles((previous) =>
    previous.map((file) =>
      file.id === id
        ? { ...file, name: trimmedName }
        : file
    )
  );
};

const moveFile = (id) => {
    const folderList = folders
      .map((folder, index) => `${index + 1}. ${folder.name}`)
      .join("\n");

    const choice = window.prompt(
      `Choose a destination by entering its number:\n\n0. Main workspace (no folder)\n${folderList}`
    );

    if (choice === null) return;

    const destination = Number(choice);

    if (
      !Number.isInteger(destination) ||
      destination < 0 ||
      destination > folders.length
    ) {
      alert("Invalid folder selection.");
      return;
    }

    const selectedFolder = destination === 0 ? null : folders[destination - 1];

    setFiles((previous) =>
      previous.map((file) =>
        file.id === id
          ? { ...file, folderId: selectedFolder ? selectedFolder.id : null }
          : file
      )
    );

    alert(
      selectedFolder
        ? `File moved to ${selectedFolder.name}!`
        : "File moved to the main workspace!"
    );
  };

  const deleteFile = (id) => {
    setFiles((previous) =>
      previous.map((file) =>
        file.id === id ? { ...file, deleted: true } : file
      )
    );
  };

  const restoreFile = (id) => {
    setFiles((previous) =>
      previous.map((file) =>
        file.id === id ? { ...file, deleted: false } : file
      )
    );
  };

  const openPreview = (file) => {
  if (!file.url || !file.originalFile) {
    alert("This is a demo file. Upload an actual file to preview it.");
    return;
  }

  const fileType = file.originalFile.type;

  if (
    !fileType.startsWith("image/") &&
    fileType !== "application/pdf"
  ) {
    alert("Preview is currently available for images and PDFs only.");
    return;
  }

  setPreviewFile(file);
};

  const downloadFile = (file) => {
    if (!file.url) {
      alert("This is a demo file. Real downloading will be added when storage is connected.");
      return;
    }

    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.name;
    link.click();
  };

  const getFileIcon = (type) => {
    if (type === "image") return <Image />;
    if (type === "video") return <Video />;
    if (type === "document") return <FileText />;
    return <File />;
  };

  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);
  const pageTitle = activePage === "Dashboard"
    ? "Overview"
    : activePage === "Folders" && selectedFolder
    ? selectedFolder.name
    : activePage;

  return (
    <div className="app-container">

      {/* SIDEBAR */}
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>

        <div className="brand">
          <div className="brand-icon"><Cloud size={25} /></div>
          <span>Cloud<span className="brand-highlight">Space</span></span>
          <button className="mobile-close" onClick={() => setMobileMenu(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${activePage === item.name ? "active" : ""}`}
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

          <div className="storage-card">
            <div className="storage-icon"><HardDrive size={19} /></div>
            <div className="storage-heading">
              <span>Storage</span>
              <span> {Math.min(usedStorage, 15).toFixed(1)} / 15 GB</span>
            </div>
            <div className="storage-progress">
              <div style={{ width: `${Math.min((usedStorage / 15) * 100, 100)}%` }} />
            </div>
            <p>Storage usage (demo)</p>
          </div>

          <button className="nav-item settings-button" onClick={() => setActivePage("Settings")}>
            <Settings size={19} />
            <span>Settings</span>
          </button>

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
        <div className="mobile-overlay" onClick={() => setMobileMenu(false)} />
      )}

      {/* MAIN CONTENT */}
      <main className="main-content">

        {/* TOPBAR */}
        <header className="topbar">
          <button className="mobile-menu-button" onClick={() => setMobileMenu(true)}>
            <Menu size={22} />
          </button>

          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={15} />
            <strong>{pageTitle}</strong>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search your files..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="search-shortcut">⌘ K</span>
            </div>

            <button className="notification-button" aria-label="Notifications">
              <Bell size={19} />
              <span />
            </button>
          </div>
        </header>

        {/* PAGE */}
        <div className="page-content">

          <section className="welcome-section">
            <div>
              <p className="eyebrow">YOUR PERSONAL CLOUD</p>
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
              <button className="secondary-button" onClick={createFolder}>
                <FolderPlus size={17} />
                New Folder
              </button>

              <button className="primary-button" onClick={() => fileInput.current?.click()}>
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
              <p>Account preferences and security settings will be added later.</p>
            </section>
          ) : (
            <>
              {/* STORAGE OVERVIEW */}
              {activePage === "Dashboard" && (
                <section className="overview-grid">

                  <div className="overview-card storage-overview">
                    <div className="overview-top">
                      <div>
                        <p className="card-label">TOTAL STORAGE USED</p>
                        <h2>{usedStorage.toFixed(2)} <span>GB</span></h2>
                      </div>
                      <div className="overview-icon blue-icon"><HardDrive size={22} /></div>
                    </div>
                    <div className="overview-bottom">
                      <div className="overview-track">
                        <div style={{ width: `${Math.min((usedStorage / 15) * 100, 100)}%` }} />
                      </div>
                      <span>Of 15 GB demo capacity</span>
                    </div>
                  </div>

                  <div className="overview-card">
                    <div className="overview-top">
                      <div>
                        <p className="card-label">TOTAL FILES</p>
                        <h2>{files.filter((f) => !f.deleted).length}</h2>
                      </div>
                      <div className="overview-icon purple-icon"><File size={22} /></div>
                    </div>
                    <div className="overview-bottom">
                      <span>Files in your workspace</span>
                    </div>
                  </div>

                  <div className="overview-card">
                    <div className="overview-top">
                      <div>
                        <p className="card-label">TOTAL FOLDERS</p>
                        <h2>{folders.length}</h2>
                      </div>
                      <div className="overview-icon orange-icon"><Folder size={22} /></div>
                    </div>
                    <div className="overview-bottom">
                      <span>Your organised collections</span>
                    </div>
                  </div>

                </section>
              )}

              {/* FOLDERS */}
              {activePage === "Dashboard" && (
                <section className="content-section">

                  <div className="section-heading">
                    <div>
                      <h2>Folders</h2>
                      <p>Organise your files your way.</p>
                    </div>
                    <button className="text-button" onClick={createFolder}>
                      View / Create <ChevronRight size={16} />
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
                        <div className={`folder-icon ${folder.color}`}>
                          <Folder size={24} fill="currentColor" />
                        </div>
                        <div className="folder-details">
                          <strong>{folder.name}</strong>
                          <span>{files.filter((file) => !file.deleted && file.folderId === folder.id).length} items</span>
                        </div>
                        <MoreHorizontal size={19} className="folder-more" />
                      </div>
                    ))}
                  </div>

                </section>
              )}

              {/* FOLDERS PAGE */}
              {activePage === "Folders" && (
                <section className="content-section">
                  <div className="section-heading">
                    <div>
                      <h2>{selectedFolder ? selectedFolder.name : "All Folders"}</h2>
                      <p>
                        {selectedFolder
                          ? "Files saved inside this folder."
                          : "Choose a folder to view and manage its files."}
                      </p>
                    </div>
                    {selectedFolder ? (
                      <button
                        className="text-button"
                        onClick={() => setSelectedFolderId(null)}
                      >
                        <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
                        All folders
                      </button>
                    ) : (
                      <button className="text-button" onClick={createFolder}>
                        <FolderPlus size={16} /> New folder
                      </button>
                    )}
                  </div>

                  {!selectedFolder && (
                    <div className="folder-grid">
                      {folders.map((folder) => (
                        <div
                          className="folder-card"
                          key={folder.id}
                          onClick={() => setSelectedFolderId(folder.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              setSelectedFolderId(folder.id);
                            }
                          }}
                        >
                          <div className={`folder-icon ${folder.color}`}>
                            <Folder size={24} fill="currentColor" />
                          </div>
                          <div className="folder-details">
                            <strong>{folder.name}</strong>
                            <span>
                              {files.filter((file) => !file.deleted && file.folderId === folder.id).length} items
                            </span>
                          </div>
                          <MoreHorizontal size={19} className="folder-more" />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* RECENT FILES */}
              {!(activePage === "Folders" && !selectedFolder) && (
              <section className="content-section recent-section">

                <div className="section-heading">
                  <div>
                    <h2>{activePage === "Dashboard" ? "Recent Files" : activePage === "Trash" ? "Deleted Files" : "Your Files"}</h2>
                    <p>
                      {activePage === "Dashboard"
                        ? "Your recently accessed files."
                        : "Manage your uploaded files."}
                    </p>
                  </div>
                  {activePage === "Dashboard" && (
                    <button className="text-button" onClick={() => setActivePage("My Files")}>
                      View all <ChevronRight size={16} />
                    </button>
                  )}
                </div>

                <div className="file-table">

                  <div className="file-table-header">
                    <span>NAME</span>
                    <span>SIZE</span>
                    <span>MODIFIED</span>
                    <span>ACTIONS</span>
                  </div>

                  {visibleFiles.length === 0 ? (
                    <div className="empty-files">
                      <Folder size={35} />
                      <h3>No files found</h3>
                      <p>Upload a file or try a different search.</p>
                    </div>
                  ) : (
                    visibleFiles.map((file) => (
                      <div className="file-row" key={file.id}>
                        <div className="file-name">
                          <div className={`file-type-icon ${file.type}`}>
                            {getFileIcon(file.type)}
                          </div>
                          <span>
                            {file.name}
                            {file.folderId && (
                              <small style={{
                                display: "block",
                                fontSize: "11px",
                                color: "#9299aa",
                                marginTop: "4px"
                              }}>
                                {folders.find((folder) => folder.id === file.folderId)?.name}
                              </small>
                            )}
                          </span>
                        </div>

                        <span className="file-meta">{file.size}</span>
                        <span className="file-meta">{file.date}</span>

                        <div className="file-actions">
                          {file.deleted ? (
                            <button title="Restore file" onClick={() => restoreFile(file.id)}>
                              <Folder size={17} />
                            </button>
                          ) : (
                            <>
                              <button
                                title="Rename file"
                                onClick={() => renameFile(file.id)}
                              >
                                <Pencil size={17} />
                              </button>
                              <button
                                title="Move to folder"
                                onClick={() => moveFile(file.id)}
                              >
                                <FolderPlus size={17} />
                              </button>
                              <button
                                title="Preview file"
                                onClick={() => openPreview(file)}
                              >
                                <Eye size={17} />
                              </button>
                              <button
                                title="Download"
                                onClick={() => downloadFile(file)}
                              >
                                <Download size={17} />
                              </button>

                              <button
                                title="Move to trash"
                                onClick={() => deleteFile(file.id)}
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
          {previewFile && (
            <div
              className="preview-overlay"
              onClick={() => setPreviewFile(null)}
            >
              <div
                className="preview-modal"
                onClick={(event) => event.stopPropagation()}
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
                  {previewFile.originalFile.type.startsWith("image/") ? (
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

          <footer className="footer">
            <span>© 2026 CloudSpace</span>
            <span>Personal Cloud Workspace · Prototype</span>
          </footer>

        </div>
      </main>
    </div>
  );
}

export default App;