import { useState } from "react";

const P = "#5B3DF5";
const PL = "rgba(91,61,245,0.08)";
const SIDEBAR = "#1A1626";
const SIDEBAR_ACTIVE = "rgba(91,61,245,0.15)";
const CARD = { background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" };
const tag = { display:"inline-block", padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:500, margin:"2px 3px" };

const SIDEBAR_ITEMS = [
  { section:"Main", items:[
    { key:"dashboard", icon:"📊", label:"Dashboard" },
    { key:"schools", icon:"🏛", label:"Schools" },
    { key:"departments", icon:"🏫", label:"Departments" },
    { key:"branches", icon:"🔀", label:"Branches" },
  ]},
  { section:"Administration", items:[
    { key:"deans", icon:"👤", label:"Deans" },
    { key:"hods", icon:"👥", label:"HODs" },
    { key:"faculty", icon:"🎓", label:"Faculty" },
    { key:"faculty-search", icon:"🔍", label:"Faculty Search" },
    { key:"users", icon:"👥", label:"Users" },
  ]},
  { section:"System", items:[
    { key:"reports", icon:"📋", label:"Reports" },
    { key:"settings", icon:"⚙️", label:"Settings" },
  ]},
];

const SCHOOLS = [
  "All Schools","School of CS & IT","School of Emerging Technologies",
  "School of Electronics","School of Bio Technology",
  "School of Mechanical Engineering","School of Management",
  "School of Humanities & Applied Sciences","School of Computer Applications",
];

const DEPARTMENTS = [
  "All Departments","Computer Science & Engineering","Information Technology",
  "Computer Science","Data Science & AI","Cyber Security",
  "Mathematics & Computing","CS & Business Systems","Artificial Intelligence",
  "AI & Machine Learning","Internet of Things","Electronics & Communication",
  "Electrical & Electronics","VLSI Design","Bio Technology",
  "Mechanical Engineering","MBA","Applied Sciences","MCA",
];

const BRANCHES = ["All Branches","CSE","IT","CS","DS/AI_DS","CYS","MNC","CSBS","AI","AIML","IoT","ECE","EEE","VLSI","BT","ME","MBA","HAS/APPLIED","MCA"];

const HODS = ["All HODs / Deans","Dr. Arvind Sharma (HOD - CSE)","Dr. Neha Gupta (HOD - IT)","Dr. Rajesh Kumar (Dean)","Dr. Priya Singh (HOD - ECE)"];

const FACULTY_NAMES = [
  "Dr. Arvind Kumar Sharma","Dr. Neha Gupta","Dr. Rajesh Kumar","Dr. Priya Singh",
  "Dr. Amit Verma","Dr. Sunita Patel","Prof. Vikram Joshi","Dr. Pooja Mehta",
  "Dr. Sandeep Yadav","Prof. Anjali Tiwari","Dr. Ravi Prakash","Dr. Kavita Sharma",
  "Prof. Manoj Kumar","Dr. Deepa Singh","Dr. Vijay Chauhan",
];

const MOCK_FACULTY = {
  faculty_id:42,
  name:"Dr. Arvind Kumar Sharma",
  designation:"Professor & HOD",
  department:"Computer Science & Engineering",
  dept_code:"CSE",
  school:"School of CS & IT",
  employee_id:"NIET-FAC-0042",
  email:"arvind.sharma@niet.co.in",
  phone:"+91-9876543210",
  office:"Block A, Room 302",
  joining_year:2015,
  orcid:"0000-0002-1234-5678",
  google_scholar:"8XXy5vkAAAAJ",
  scopus_id:"57123456789",
  researchgate:"Arvind_Sharma",
  status:"Active",
  photo_initials:"AS",
  stats:{ publications:87, citations:1842, h_index:24, i10_index:38, projects:12, patents:5 },
  personal:{
    full_name:"Dr. Arvind Kumar Sharma",
    gender:"Male",
    dob:"15 March 1980",
    qualification:"Ph.D. (Computer Science), M.Tech (CSE)",
    experience:"18 Years",
    specialization:"Artificial Intelligence, Machine Learning, Data Science",
    institution:"NIET, Greater Noida",
    address:"Noida, Uttar Pradesh, India",
    biography:"Dr. Arvind Kumar Sharma is a distinguished academician and researcher with over 18 years of experience in higher education. He has published 87 research papers in reputed international journals and conferences, with a h-index of 24 and over 1,800 citations. His research interests span Artificial Intelligence, Machine Learning, Deep Learning, and Natural Language Processing. He has guided 8 Ph.D. scholars and 25 M.Tech students. He is also serving as a reviewer for several IEEE and Springer journals.",
  },
  academic:{
    school:"School of CS & IT",
    department:"Computer Science & Engineering",
    branch:"CSE",
    reporting_dean:"Dr. Rajesh Kumar (Dean)",
    reporting_hod:"Self (HOD)",
    subjects_teaching:["Advanced Machine Learning","Deep Learning","Data Structures & Algorithms","AI in IoT"],
    research_areas:["AI","ML","NLP","Data Mining","Deep Learning","Computer Vision"],
  },
  publications:[
    { title:"Deep Learning Approaches for Sentiment Analysis in Social Media Networks", journal:"IEEE Transactions on Neural Networks", year:2024, citations:45, doi:"10.1109/TNN.2024.12345" },
    { title:"A Hybrid Framework for Real-Time Object Detection Using CNNs and Transformers", journal:"Pattern Recognition Letters", year:2024, citations:32, doi:"10.1016/j.patrec.2024.01.008" },
    { title:"Blockchain-Enabled Secure Data Sharing Framework for Healthcare IoT", journal:"Journal of Medical Systems", year:2023, citations:78, doi:"10.1007/s10916-023-01912-x" },
    { title:"Multi-Modal Federated Learning for Smart Healthcare Applications", journal:"IEEE Internet of Things Journal", year:2023, citations:56, doi:"10.1109/JIOT.2023.3245678" },
    { title:"An Efficient Approach for Text Summarization Using BERT and Graph Neural Networks", journal:"Expert Systems with Applications", year:2023, citations:41, doi:"10.1016/j.eswa.2023.119876" },
    { title:"AI-Driven Predictive Analytics for Student Academic Performance", journal:"Education and Information Technologies", year:2022, citations:92, doi:"10.1007/s10639-022-11045-6" },
  ],
  projects:[
    { title:"AI-Based Student Performance Prediction System", funding:"AICTE Research Grant", amount:"₹ 12.5 Lakhs", status:"Completed", year:"2022-24" },
    { title:"Secure IoT Framework for Smart Campus", funding:"DST SERB", amount:"₹ 18 Lakhs", status:"Ongoing", year:"2023-25" },
    { title:"NLP-Driven Chatbot for Academic Queries", funding:"ICSSR", amount:"₹ 5 Lakhs", status:"Completed", year:"2021-22" },
  ],
  patents:[
    { title:"System and Method for Real-Time Anomaly Detection in IoT Networks", status:"Granted", patent_no:"IN 456789", year:2024 },
    { title:"AI-Powered Adaptive Learning Platform", status:"Filed", patent_no:"IN 20241105678", year:2024 },
    { title:"Blockchain-Based Document Verification System", status:"Granted", patent_no:"IN 412356", year:2023 },
  ],
  achievements:[
    { title:"Best Researcher Award 2024", issuer:"NIET, Greater Noida", year:2024 },
    { title:"Outstanding Faculty Award 2023", issuer:"AKTU, Lucknow", year:2023 },
    { title:"Young Scientist Award 2020", issuer:"DST, Government of India", year:2020 },
  ],
  awards:[
    { title:"Best Paper Award - ICCCNT 2023", conference:"IEEE International Conference", year:2023 },
    { title:"Excellence in Research Award", issuer:"ISTE", year:2022 },
  ],
  guidance:[
    { student:"Mr. Rahul Verma", program:"Ph.D.", topic:"Deep Learning for Medical Imaging", status:"Ongoing", year:"2022-Present" },
    { student:"Ms. Shreya Gupta", program:"Ph.D.", topic:"NLP for Indian Languages", status:"Completed", year:"2019-2023" },
    { student:"Mr. Abhishek Singh", program:"M.Tech", topic:"IoT Security Frameworks", status:"Completed", year:"2022-2023" },
  ],
  documents:[
    { name:"Resume - Dr. Arvind Sharma", type:"PDF", size:"245 KB", uploaded:"12 Jun 2025" },
    { name:"Research Statement", type:"PDF", size:"1.2 MB", uploaded:"05 Mar 2025" },
    { name:"Teaching Philosophy", type:"DOCX", size:"890 KB", uploaded:"18 Jan 2025" },
    { name:"Award Certificate - Best Researcher 2024", type:"PDF", size:"520 KB", uploaded:"20 Dec 2024" },
  ],
  completion:95,
  academic_links:[
    { name:"Google Scholar", icon:"🎓", url:"#", color:"#0C447C" },
    { name:"Scopus", icon:"📊", url:"#", color:"#E8762B" },
    { name:"ORCID", icon:"🔗", url:"#", color:"#A6CE39" },
    { name:"ResearchGate", icon:"🧬", url:"#", color:"#00CCBB" },
  ],
  social_links:[
    { name:"LinkedIn", icon:"💼", url:"#", color:"#0A66C2" },
    { name:"X (Twitter)", icon:"🐦", url:"#", color:"#1DA1F2" },
  ],
  recent_activity:[
    { action:"Updated Research Areas", time:"2 hours ago" },
    { action:"New publication added - IEEE TNN 2024", time:"1 day ago" },
    { action:"Google Scholar synced", time:"3 days ago" },
    { action:"Project milestone updated - Smart Campus IoT", time:"5 days ago" },
    { action:"Patent filed - AI Learning Platform", time:"1 week ago" },
    { action:"Profile photo updated", time:"2 weeks ago" },
  ],
};

export default function FacultySearchViewer() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selSchool, setSelSchool] = useState("All Schools");
  const [selDept, setSelDept] = useState("All Departments");
  const [selBranch, setSelBranch] = useState("All Branches");
  const [selHod, setSelHod] = useState("All HODs / Deans");
  const [facultyInput, setFacultyInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState("projects");
  const [faculty] = useState(MOCK_FACULTY);

  const filteredNames = FACULTY_NAMES.filter(n =>
    n.toLowerCase().includes(facultyInput.toLowerCase())
  );

  const handleSearch = () => {
    setSearchQuery(facultyInput);
    setShowProfile(true);
    setShowDropdown(false);
  };

  const handleReset = () => {
    setSelSchool("All Schools");
    setSelDept("All Departments");
    setSelBranch("All Branches");
    setSelHod("All HODs / Deans");
    setFacultyInput("");
    setShowProfile(false);
    setSearchQuery("");
  };

  const inputStyle = {
    padding:"10px 14px", border:"1px solid #e2e2ea", borderRadius:10, fontSize:13,
    outline:"none", background:"#fafafc", color:"#1a1a1a", width:"100%",
  };

  const Pbtn = { background:P, color:"#fff", border:"none", borderRadius:10, padding:"10px 28px", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 };
  const Gbtn = { background:"#f0f0f5", color:"#666", border:"none", borderRadius:10, padding:"10px 22px", fontSize:13, fontWeight:500, cursor:"pointer" };

  if (!showProfile) {
    return (
      <div style={{ minHeight:"100vh", background:"#f5f5f8", display:"flex" }}>
        {/* ─── SIDEBAR ─── */}
        <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        {/* ─── MAIN ─── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
          <AdminHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          <div style={{ flex:1, overflowY:"auto", padding:20 }}>
            {/* Smart Search Filter */}
            <div style={{ ...CARD, padding:"22px 28px", marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:600, color:"#1a1a1a", marginBottom:4 }}>Smart Search Filter</div>
              <div style={{ fontSize:12, color:"#888", marginBottom:18 }}>Search faculty across all schools, departments, and branches</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 2fr", gap:12, marginBottom:16 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:"#555", marginBottom:4, display:"block" }}>School</label>
                  <select value={selSchool} onChange={e=>setSelSchool(e.target.value)} style={inputStyle}>
                    {SCHOOLS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:"#555", marginBottom:4, display:"block" }}>Department</label>
                  <select value={selDept} onChange={e=>setSelDept(e.target.value)} style={inputStyle}>
                    {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:"#555", marginBottom:4, display:"block" }}>Branch</label>
                  <select value={selBranch} onChange={e=>setSelBranch(e.target.value)} style={inputStyle}>
                    {BRANCHES.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:"#555", marginBottom:4, display:"block" }}>HOD / Dean</label>
                  <select value={selHod} onChange={e=>setSelHod(e.target.value)} style={inputStyle}>
                    {HODS.map(h=><option key={h}>{h}</option>)}
                  </select>
                </div>
                <div style={{ position:"relative" }}>
                  <label style={{ fontSize:11, fontWeight:600, color:"#555", marginBottom:4, display:"block" }}>Faculty Name</label>
                  <input
                    value={facultyInput}
                    onChange={e=>{setFacultyInput(e.target.value);setShowDropdown(true)}}
                    onFocus={()=>setShowDropdown(true)}
                    onBlur={()=>setTimeout(()=>setShowDropdown(false),200)}
                    placeholder="Search faculty by name..."
                    style={inputStyle}
                  />
                  {showDropdown && filteredNames.length>0 && (
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e2e2ea", borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,0.08)", zIndex:10, marginTop:2, maxHeight:180, overflowY:"auto" }}>
                      {filteredNames.map(n=>(
                        <div key={n} onMouseDown={()=>{setFacultyInput(n);setShowDropdown(false)}}
                          style={{ padding:"10px 14px", fontSize:12, cursor:"pointer", borderBottom:"1px solid #f5f5f5" }}>
                          {n}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={handleSearch} style={Pbtn}><span>🔍</span> Search</button>
                <button onClick={handleReset} style={Gbtn}>Reset Filters</button>
              </div>
            </div>

            {/* Initial prompt */}
            <div style={{ ...CARD, padding:"60px 40px", textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:16, opacity:0.3 }}>🔍</div>
              <div style={{ fontSize:18, fontWeight:600, color:"#1a1a1a", marginBottom:8 }}>Search for Faculty Members</div>
              <div style={{ fontSize:13, color:"#888", maxWidth:400, margin:"0 auto" }}>
                Use the smart search filters above to find faculty, HODs, and Deans across all schools and departments. View complete profiles including publications, research metrics, and academic information.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFILE VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  const f = faculty;
  const s = f.stats;
  const p = f.personal;
  const a = f.academic;

  const bottomTabs = [
    { key:"projects", icon:"💼", label:"Projects" },
    { key:"patents", icon:"💡", label:"Patents" },
    { key:"achievements", icon:"🏆", label:"Achievements" },
    { key:"awards", icon:"⭐", label:"Awards" },
    { key:"guidance", icon:"🎓", label:"Student Guidance" },
    { key:"documents", icon:"📄", label:"Documents" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#f5f5f8", display:"flex" }}>
      {/* ─── SIDEBAR ─── */}
      <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      {/* ─── MAIN ─── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <AdminHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          {/* Back to search */}
          <div onClick={()=>setShowProfile(false)} style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:12, color:P, cursor:"pointer", marginBottom:12, fontWeight:500 }}>
            <span>←</span> Back to Search Results
          </div>

          {/* ─── MAIN 3-COL LAYOUT ─── */}
          <div style={{ display:"grid", gridTemplateColumns:"280px 1fr 260px", gap:16, alignItems:"start" }}>

            {/* ═══ LEFT: Profile Panel ═══ */}
            <div style={{ ...CARD, overflow:"hidden" }}>
              {/* Photo */}
              <div style={{ background:`linear-gradient(135deg, ${P}, #7B5DF5)`, padding:"28px 20px 20px", textAlign:"center", position:"relative" }}>
                <div style={{ position:"relative", display:"inline-block" }}>
                  <div style={{
                    width:88, height:88, borderRadius:"50%", background:"rgba(255,255,255,0.2)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:28, fontWeight:700, color:"#fff", border:"3px solid rgba(255,255,255,0.4)",
                  }}>
                    {f.photo_initials}
                  </div>
                  <div style={{ position:"absolute", bottom:0, right:0, width:28, height:28, borderRadius:"50%", background:P, border:"2px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, cursor:"pointer", boxShadow:"0 2px 6px rgba(0,0,0,0.2)" }}>
                    📷
                  </div>
                </div>
              </div>
              {/* Info */}
              <div style={{ padding:"16px 18px 10px", textAlign:"center", borderBottom:"1px solid #f0f0f5" }}>
                <div style={{ fontSize:16, fontWeight:700, color:"#1a1a1a" }}>{f.name}</div>
                <div style={{ fontSize:11, color:P, fontWeight:600, marginTop:2 }}>{f.designation}</div>
                <div style={{ fontSize:11, color:"#888", marginTop:3 }}>{f.department}</div>
                <div style={{ fontSize:11, color:"#888" }}>{f.school}</div>
                <div style={{ marginTop:8, display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
                  <span style={{ background:PL, color:P, padding:"2px 10px", borderRadius:10, fontSize:10, fontWeight:600 }}>{f.dept_code}</span>
                  <span style={{ background:"#EAF3DE", color:"#27500A", padding:"2px 10px", borderRadius:10, fontSize:10, fontWeight:600 }}>● {f.status}</span>
                </div>
              </div>
              {/* Details */}
              <div style={{ padding:"12px 18px", borderBottom:"1px solid #f0f0f5" }}>
                {[
                  ["🆔", "Employee ID", f.employee_id],
                  ["✉", "Email", f.email],
                  ["📞", "Phone", f.phone],
                  ["📍", "Office", f.office],
                  ["📅", "Joining Year", f.joining_year],
                  ["🔗", "ORCID", f.orcid],
                  ["🎓", "Google Scholar", f.google_scholar],
                  ["📊", "Scopus ID", f.scopus_id],
                  ["🧬", "ResearchGate", f.researchgate],
                ].map(([icon,label,val])=>(
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", fontSize:11 }}>
                    <span style={{ width:16, textAlign:"center", fontSize:12 }}>{icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ color:"#888" }}>{label}</div>
                      <div style={{ color:"#1a1a1a", fontWeight:500 }}>{val}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Stats */}
              <div style={{ padding:"14px 16px", borderBottom:"1px solid #f0f0f5" }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#888", marginBottom:10, textTransform:"uppercase", letterSpacing:0.5 }}>Research Metrics</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[
                    ["📄","Publications",s.publications,"#EEEDFE",P],
                    ["💬","Citations",s.citations?.toLocaleString(),"#E6F1FB","#0C447C"],
                    ["📈","h-index",s.h_index,"#EAF3DE","#27500A"],
                    ["📊","i10-index",s.i10_index,"#FAEEDA","#633806"],
                    ["💼","Projects",s.projects,"#E1F5EE","#085041"],
                    ["💡","Patents",s.patents,"#FCEBEB","#A32D2D"],
                  ].map(([icon,label,val,bg,color])=>(
                    <div key={label} style={{ background:bg, borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                      <div style={{ fontSize:16, marginBottom:2 }}>{icon}</div>
                      <div style={{ fontSize:16, fontWeight:700, color }}>{val}</div>
                      <div style={{ fontSize:9, color:"#888" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Action buttons */}
              <div style={{ padding:"14px 18px", display:"flex", gap:8, flexDirection:"column" }}>
                <button style={{ ...Pbtn, justifyContent:"center", width:"100%" }}>✏ Edit Profile</button>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <button style={{ ...Gbtn, textAlign:"center", justifyContent:"center" }}>📄 Export PDF</button>
                  <button style={{ ...Gbtn, textAlign:"center", justifyContent:"center" }}>🖨 Print</button>
                </div>
                <button style={{ background:"transparent", color:P, border:"1px solid "+P, borderRadius:10, padding:"8px 16px", fontSize:12, fontWeight:500, cursor:"pointer" }}>📚 View All Publications</button>
              </div>
            </div>

            {/* ═══ CENTER: Profile Content ═══ */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

              {/* Personal Information */}
              <div style={{ ...CARD, padding:"18px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>Personal Information</div>
                    <div style={{ fontSize:11, color:"#888" }}>Basic details and background</div>
                  </div>
                  <span style={{ fontSize:14, color:P, cursor:"pointer", padding:"6px 10px", borderRadius:6, background:PL }}>✏</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px 18px" }}>
                  {[
                    ["Full Name",p.full_name],["Gender",p.gender],["Date of Birth",p.dob],
                    ["Qualification",p.qualification],["Experience",p.experience],["Specialization",p.specialization],
                    ["Institution",p.institution],["Address",p.address],
                  ].map(([label,val])=>(
                    <div key={label}>
                      <div style={{ fontSize:10, color:"#888", marginBottom:2, fontWeight:500 }}>{label}</div>
                      <div style={{ fontSize:12, color:"#1a1a1a", fontWeight:500 }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:10, color:"#888", marginBottom:2, fontWeight:500 }}>Biography</div>
                  <div style={{ fontSize:12, color:"#444", lineHeight:1.6 }}>{p.biography}</div>
                </div>
              </div>

              {/* Academic Information */}
              <div style={{ ...CARD, padding:"18px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>Academic Information</div>
                    <div style={{ fontSize:11, color:"#888" }}>Department, subjects, and research areas</div>
                  </div>
                  <span style={{ fontSize:14, color:P, cursor:"pointer", padding:"6px 10px", borderRadius:6, background:PL }}>✏</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                  {[
                    ["School",a.school],["Department",a.department],["Branch",a.branch],
                    ["Reporting Dean",a.reporting_dean],["Reporting HOD",a.reporting_hod],
                  ].map(([label,val])=>(
                    <div key={label}>
                      <div style={{ fontSize:10, color:"#888", marginBottom:2, fontWeight:500 }}>{label}</div>
                      <div style={{ fontSize:12, color:"#1a1a1a", fontWeight:500 }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:14 }}>
                  <div style={{ fontSize:10, color:"#888", marginBottom:6, fontWeight:500 }}>Subjects Teaching</div>
                  <div>{a.subjects_teaching.map(s=><span key={s} style={{ ...tag, background:PL, color:P }}>{s}</span>)}</div>
                </div>
                <div style={{ marginTop:8 }}>
                  <div style={{ fontSize:10, color:"#888", marginBottom:6, fontWeight:500 }}>Research Areas</div>
                  <div>{a.research_areas.map(r=>{
                    const colors = {AI:"#EEEDFE",ML:"#E6F1FB",NLP:"#EAF3DE","Data Mining":"#FAEEDA","Deep Learning":"#E1F5EE","Computer Vision":"#FCEBEB"};
                    const textColors = {AI:P,ML:"#0C447C",NLP:"#27500A","Data Mining":"#633806","Deep Learning":"#085041","Computer Vision":"#A32D2D"};
                    return <span key={r} style={{ ...tag, background:colors[r]||PL, color:textColors[r]||P }}>{r}</span>;
                  })}</div>
                </div>
              </div>

              {/* Publications & Research */}
              <div style={{ ...CARD, padding:"18px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>Publications & Research</div>
                    <div style={{ fontSize:11, color:"#888" }}>Recent publications and research output</div>
                  </div>
                  <span style={{ fontSize:12, color:P, cursor:"pointer", fontWeight:500 }}>View All →</span>
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <thead>
                      <tr style={{ background:"#f8f8fb" }}>
                        {["Title","Journal","Year","Citations","DOI"].map(h=><th key={h} style={{ padding:"8px 10px", color:"#888", fontWeight:500, textAlign:"left", borderBottom:"1px solid #eee", whiteSpace:"nowrap" }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {f.publications.map((pub,i)=>(
                        <tr key={i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                          <td style={{ padding:"8px 10px", fontWeight:500, color:"#1a1a1a", minWidth:180 }}>{pub.title}</td>
                          <td style={{ padding:"8px 10px", color:"#666" }}>{pub.journal}</td>
                          <td style={{ padding:"8px 10px", color:"#888" }}>{pub.year}</td>
                          <td style={{ padding:"8px 10px" }}><span style={{ background:"#EEEDFE", color:P, padding:"2px 8px", borderRadius:6, fontWeight:600 }}>{pub.citations}</span></td>
                          <td style={{ padding:"8px 10px", color:P, fontSize:10 }}>{pub.doi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ═══ RIGHT: Sidebar ═══ */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

              {/* Profile Completion */}
              <div style={{ ...CARD, padding:"18px 16px" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:12 }}>Profile Completion</div>
                <div style={{ textAlign:"center", position:"relative" }}>
                  <svg width="100" height="100" viewBox="0 0 100 100" style={{ margin:"0 auto" }}>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#ececf0" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke={P} strokeWidth="8"
                      strokeDasharray={`${2*Math.PI*42*f.completion/100} ${2*Math.PI*42*(100-f.completion)/100}`}
                      strokeLinecap="round" transform="rotate(-90 50 50)" />
                  </svg>
                  <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", fontSize:22, fontWeight:700, color:P }}>
                    {f.completion}%
                  </div>
                </div>
                <div style={{ textAlign:"center", fontSize:11, color:"#888", marginTop:8 }}>Profile completeness level</div>
                <div style={{ marginTop:10, display:"flex", gap:3 }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(i=>(
                    <div key={i} style={{ flex:1, height:4, borderRadius:2, background:i<=Math.round(f.completion/10)?P:"#ececf0" }} />
                  ))}
                </div>
              </div>

              {/* Academic Links */}
              <div style={{ ...CARD, padding:"18px 16px" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:10 }}>Academic Links</div>
                {f.academic_links.map(l=>(
                  <div key={l.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", cursor:"pointer", borderBottom:"1px solid #f5f5f5" }}>
                    <span style={{ fontSize:14 }}>{l.icon}</span>
                    <span style={{ flex:1, fontSize:12, color:"#333", fontWeight:500 }}>{l.name}</span>
                    <span style={{ fontSize:10, color:l.color, fontWeight:600 }}>View →</span>
                  </div>
                ))}
              </div>

              {/* Social Links */}
              <div style={{ ...CARD, padding:"18px 16px" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:10 }}>Social Links</div>
                {f.social_links.map(l=>(
                  <div key={l.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", cursor:"pointer" }}>
                    <span style={{ fontSize:14 }}>{l.icon}</span>
                    <span style={{ flex:1, fontSize:12, color:"#333", fontWeight:500 }}>{l.name}</span>
                    <span style={{ fontSize:10, color:l.color, fontWeight:600 }}>Connect →</span>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div style={{ ...CARD, padding:"18px 16px" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:10 }}>Recent Activity</div>
                <div style={{ position:"relative", paddingLeft:16 }}>
                  <div style={{ position:"absolute", left:6, top:4, bottom:4, width:2, background:"#ececf0" }} />
                  {f.recent_activity.map((act,i)=>(
                    <div key={i} style={{ position:"relative", padding:"0 0 12px 16px" }}>
                      <div style={{ position:"absolute", left:-12, top:5, width:8, height:8, borderRadius:"50%", background:P, border:"2px solid #fff", boxShadow:"0 0 0 2px "+P }} />
                      <div style={{ fontSize:11, color:"#333" }}>{act.action}</div>
                      <div style={{ fontSize:9, color:"#aaa", marginTop:1 }}>{act.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── BOTTOM: Tabbed Cards ─── */}
          <div style={{ ...CARD, padding:"18px 20px", marginTop:16 }}>
            <div style={{ display:"flex", gap:2, borderBottom:"1px solid #eee", marginBottom:16 }}>
              {bottomTabs.map(t=>(
                <div key={t.key} onClick={()=>setActiveBottomTab(t.key)} style={{
                  padding:"8px 16px", fontSize:12, fontWeight:500, cursor:"pointer",
                  color: activeBottomTab===t.key ? P : "#888",
                  borderBottom: activeBottomTab===t.key ? `2px solid ${P}` : "2px solid transparent",
                  display:"flex", alignItems:"center", gap:5,
                  background: activeBottomTab===t.key ? PL : "transparent",
                  borderRadius:"8px 8px 0 0",
                }}>
                  <span>{t.icon}</span> {t.label}
                </div>
              ))}
            </div>

            {/* Projects */}
            {activeBottomTab==="projects" && (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr style={{ background:"#f8f8fb" }}>
                      {["Title","Funding","Amount","Year","Status","Actions"].map(h=><th key={h} style={{ padding:"8px 12px", color:"#888", fontWeight:500, textAlign:"left", borderBottom:"1px solid #eee", whiteSpace:"nowrap" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {f.projects.length===0 ? (
                      <tr><td colSpan={6} style={{ padding:24, textAlign:"center", color:"#aaa", fontSize:12 }}>No projects found</td></tr>
                    ) : f.projects.map((proj,i)=>(
                      <tr key={i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                        <td style={{ padding:"10px 12px", fontWeight:500, color:"#1a1a1a" }}>{proj.title}</td>
                        <td style={{ padding:"10px 12px", color:"#666" }}>{proj.funding||"-"}</td>
                        <td style={{ padding:"10px 12px", color:"#888" }}>{proj.amount||"-"}</td>
                        <td style={{ padding:"10px 12px", color:"#888" }}>{proj.year||"-"}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <span style={{ padding:"2px 8px", borderRadius:6, fontSize:10, fontWeight:600, background:proj.status==="Completed"?"#EAF3DE":"#FAEEDA", color:proj.status==="Completed"?"#27500A":"#633806" }}>{proj.status}</span>
                        </td>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", gap:6 }}>
                            <span style={{ fontSize:11, color:P, cursor:"pointer" }}>👁</span>
                            <span style={{ fontSize:11, color:P, cursor:"pointer" }}>✏</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Patents */}
            {activeBottomTab==="patents" && (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr style={{ background:"#f8f8fb" }}>
                      {["Title","Patent No","Year","Status","Actions"].map(h=><th key={h} style={{ padding:"8px 12px", color:"#888", fontWeight:500, textAlign:"left", borderBottom:"1px solid #eee", whiteSpace:"nowrap" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {f.patents.length===0 ? (
                      <tr><td colSpan={5} style={{ padding:24, textAlign:"center", color:"#aaa", fontSize:12 }}>No patents found</td></tr>
                    ) : f.patents.map((pat,i)=>(
                      <tr key={i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                        <td style={{ padding:"10px 12px", fontWeight:500, color:"#1a1a1a" }}>{pat.title}</td>
                        <td style={{ padding:"10px 12px", color:"#666" }}>{pat.patent_no||"-"}</td>
                        <td style={{ padding:"10px 12px", color:"#888" }}>{pat.year||"-"}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <span style={{ padding:"2px 8px", borderRadius:6, fontSize:10, fontWeight:600, background:pat.status==="Granted"?"#EAF3DE":"#FAEEDA", color:pat.status==="Granted"?"#27500A":"#633806" }}>{pat.status}</span>
                        </td>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", gap:6 }}>
                            <span style={{ fontSize:11, color:P, cursor:"pointer" }}>👁</span>
                            <span style={{ fontSize:11, color:P, cursor:"pointer" }}>✏</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Achievements */}
            {activeBottomTab==="achievements" && (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr style={{ background:"#f8f8fb" }}>
                      {["Title","Issuer","Category","Year","Actions"].map(h=><th key={h} style={{ padding:"8px 12px", color:"#888", fontWeight:500, textAlign:"left", borderBottom:"1px solid #eee", whiteSpace:"nowrap" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {f.achievements.length===0 ? (
                      <tr><td colSpan={5} style={{ padding:24, textAlign:"center", color:"#aaa", fontSize:12 }}>No achievements found</td></tr>
                    ) : f.achievements.map((ach,i)=>(
                      <tr key={i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                        <td style={{ padding:"10px 12px", fontWeight:500, color:"#1a1a1a" }}>{ach.title}</td>
                        <td style={{ padding:"10px 12px", color:"#666" }}>{ach.issuer||"-"}</td>
                        <td style={{ padding:"10px 12px", color:"#888" }}>{ach.category||"-"}</td>
                        <td style={{ padding:"10px 12px", color:"#888" }}>{ach.year||"-"}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", gap:6 }}>
                            <span style={{ fontSize:11, color:P, cursor:"pointer" }}>👁</span>
                            <span style={{ fontSize:11, color:P, cursor:"pointer" }}>✏</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Awards */}
            {activeBottomTab==="awards" && (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr style={{ background:"#f8f8fb" }}>
                      {["Title","Issuer/Conference","Year","Actions"].map(h=><th key={h} style={{ padding:"8px 12px", color:"#888", fontWeight:500, textAlign:"left", borderBottom:"1px solid #eee", whiteSpace:"nowrap" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {f.awards.length===0 ? (
                      <tr><td colSpan={4} style={{ padding:24, textAlign:"center", color:"#aaa", fontSize:12 }}>No awards found</td></tr>
                    ) : f.awards.map((aw,i)=>(
                      <tr key={i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                        <td style={{ padding:"10px 12px", fontWeight:500, color:"#1a1a1a" }}>{aw.title}</td>
                        <td style={{ padding:"10px 12px", color:"#666" }}>{aw.issuer || aw.conference || "-"}</td>
                        <td style={{ padding:"10px 12px", color:"#888" }}>{aw.year||"-"}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", gap:6 }}>
                            <span style={{ fontSize:11, color:P, cursor:"pointer" }}>👁</span>
                            <span style={{ fontSize:11, color:P, cursor:"pointer" }}>✏</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Student Guidance */}
            {activeBottomTab==="guidance" && (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr style={{ background:"#f8f8fb" }}>
                      {["Student","Program","Research Topic","Status","Year","Actions"].map(h=><th key={h} style={{ padding:"8px 12px", color:"#888", fontWeight:500, textAlign:"left", borderBottom:"1px solid #eee", whiteSpace:"nowrap" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {f.guidance.map((g,i)=>(
                      <tr key={i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                        <td style={{ padding:"10px 12px", fontWeight:500, color:"#1a1a1a" }}>{g.student}</td>
                        <td style={{ padding:"10px 12px", color:"#666" }}>{g.program}</td>
                        <td style={{ padding:"10px 12px", color:"#555" }}>{g.topic}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <span style={{ padding:"2px 8px", borderRadius:6, fontSize:10, fontWeight:600, background:g.status==="Completed"?"#EAF3DE":"#FAEEDA", color:g.status==="Completed"?"#27500A":"#633806" }}>{g.status}</span>
                        </td>
                        <td style={{ padding:"10px 12px", color:"#888" }}>{g.year}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", gap:6 }}>
                            <span style={{ fontSize:11, color:P, cursor:"pointer" }}>👁</span>
                            <span style={{ fontSize:11, color:P, cursor:"pointer" }}>✏</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Documents */}
            {activeBottomTab==="documents" && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px,1fr))", gap:12 }}>
                {f.documents.map((doc,i)=>(
                  <div key={i} style={{ background:"#fafafc", borderRadius:12, padding:"14px 16px", border:"1px solid #f0f0f5", display:"flex", gap:12, alignItems:"center" }}>
                    <div style={{ width:40, height:40, borderRadius:8, background:"#E6F1FB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>📄</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:"#1a1a1a", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{doc.name}</div>
                      <div style={{ fontSize:10, color:"#888", marginTop:1 }}>{doc.type} · {doc.size}</div>
                      <div style={{ fontSize:9, color:"#aaa" }}>Uploaded: {doc.uploaded}</div>
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      <span style={{ fontSize:14, color:P, cursor:"pointer" }}>⬇</span>
                      <span style={{ fontSize:14, color:"#888", cursor:"pointer" }}>🗑</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ SHARED SUB-COMPONENTS ═══

function AdminSidebar({ sidebarOpen }) {
  return (
    <div style={{
      width: sidebarOpen ? 240 : 0, overflow:"hidden", background:SIDEBAR, color:"#fff",
      display:"flex", flexDirection:"column", transition:"width 0.2s", flexShrink:0,
    }}>
      <div style={{ padding:"20px 18px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:36, height:36, background:P, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", padding:5, boxShadow:"0 0 14px rgba(91,61,245,0.4)" }}>
          <img src="/niet-logo.svg" alt="NIET" style={{ width:"100%", height:"100%", objectFit:"contain", filter:"brightness(0) invert(1)" }} />
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>NIET</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>Admin Panel</div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
        {SIDEBAR_ITEMS.map((section,si)=>(
          <div key={si}>
            <div style={{ padding:"12px 18px 4px", fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:1 }}>{section.section}</div>
            {section.items.map(item=>{
              const isActive = item.key==="faculty-search";
              return (
                <div key={item.key} style={{
                  padding:"10px 18px", margin:"2px 8px", borderRadius:8,
                  cursor:"pointer", display:"flex", alignItems:"center", gap:10, fontSize:13,
                  background: isActive ? SIDEBAR_ACTIVE : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                  transition:"all 0.15s",
                }}>
                  <span style={{ fontSize:16, width:20, textAlign:"center" }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ padding:"12px 18px", borderTop:"1px solid rgba(255,255,255,0.06)", fontSize:11, color:"rgba(255,255,255,0.3)" }}>
        v2.0 · NIET Research Portal
      </div>
    </div>
  );
}

function AdminHeader({ sidebarOpen, setSidebarOpen, searchQuery, setSearchQuery }) {
  return (
    <div style={{ background:"#fff", borderBottom:"1px solid #e8e8ee", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <span onClick={()=>setSidebarOpen(!sidebarOpen)} style={{ fontSize:20, cursor:"pointer", color:"#888" }}>☰</span>
        <div>
          <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>Faculty Search & Profile Viewer</div>
          <div style={{ fontSize:11, color:"#888" }}>Search and view complete faculty, HOD, or Dean profile details</div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ position:"relative" }}>
          <input
            value={searchQuery}
            onChange={e=>setSearchQuery(e.target.value)}
            placeholder="Search faculty, departments..."
            style={{ padding:"7px 12px 7px 32px", border:"1px solid #e0e0e8", borderRadius:20, fontSize:12, width:220, outline:"none", background:"#f8f8fb" }}
          />
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#aaa" }}>🔍</span>
        </div>
        <div style={{ position:"relative" }}>
          <span style={{ fontSize:16, cursor:"pointer" }}>🔔</span>
          <span style={{ position:"absolute", top:-2, right:-4, width:16, height:16, borderRadius:"50%", background:"#F04438", color:"#fff", fontSize:9, display:"flex", alignItems:"center", justifyContent:"center" }}>3</span>
        </div>
        <span style={{ fontSize:16, cursor:"pointer" }}>✉</span>
        <div style={{ width:32, height:32, borderRadius:"50%", background:P, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, fontWeight:600 }}>A</div>
        <div style={{ fontSize:12, lineHeight:1.3 }}>
          <div style={{ fontWeight:600, color:"#333" }}>Administrator</div>
          <div style={{ fontSize:10, color:"#888" }}>Super Administrator</div>
        </div>
        <div onClick={()=>{localStorage.removeItem("admin_token");window.location.href="/admin";}} style={{ fontSize:11,color:"#A32D2D",padding:"4px 12px",background:"#FCEBEB",borderRadius:12,border:"none",cursor:"pointer" }}>Logout</div>
      </div>
    </div>
  );
}
