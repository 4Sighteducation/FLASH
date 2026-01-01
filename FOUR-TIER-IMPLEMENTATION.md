# 🎯 FOUR-TIER COLLAPSIBLE HIERARCHY - IMPLEMENTATION SPEC

## 📊 **Data Structure (Confirmed from SQL)**

### **Physical Education Example:**
```
Level 0: "Factors affecting participation in PA and sport" (Exam Paper)
   └─ Level 1: "Applied anatomy and physiology" (Main Section)
       └─ Level 2: "The musculo-skeletal system..." (Sub-section)
           └─ Level 3: "Levers" (Topic Header)
               ├─ Level 4: "1st class lever" (Card Topic)
               ├─ Level 4: "2nd class lever" (Card Topic)
               └─ Level 4: "3rd class lever" (Card Topic)
```

### **Current User's Topics (Level 3):**
```
Level 0: "Factors affecting participation..."
   └─ Level 1: "Applied anatomy and physiology"
       └─ Level 2: "The musculo-skeletal system..."
           ├─ Level 3: "Types of joint..." (10 cards) ← User has cards HERE
           └─ Level 3: "Joint actions frontal" (5 cards) ← And HERE
```

---

## 🎨 **UI SPEC:**

### **Collapse Levels:**
1. **Level 0 (Primary):** Exam Paper - Shows/hides entire paper
2. **Level 1 (Secondary):** Main Section - Shows/hides content area
3. **Level 2 (Tertiary):** Sub-section - Shows/hides related topics
4. **Level 3:** Header only (for Level 4+ grouping) - NOT collapsible
5. **Level 4-5:** Card topics - The items you study

### **Visual Hierarchy:**
```
📄 Paper 1: Factors affecting participation [L0] ▼
   💡 Create Overview Cards (Paper overview)
   CARD COUNT: 15 cards total
   
   📂 Applied anatomy and physiology [L1] ▼
      💡 Create Overview Cards (L1 overview)
      CARD COUNT: 10 cards
      
      📁 Musculo-skeletal system [L2] ▼
         💡 Create Overview Cards (L2 overview)
         CARD COUNT: 10 cards
         
         Levers [L3 header - not collapsible]
            • 1st class lever (0 cards) [L4]
            • 2nd class lever (0 cards) [L4]
            • 3rd class lever (0 cards) [L4]
         
         Joint actions [L3 header]
            • Frontal plane (5 cards) [L4]
            • Sagittal plane (5 cards) [L4]
   
   📂 Exercise physiology [L1] +
   
📄 Paper 2: Factors affecting optimal performance [L0] +
```

---

## 💾 **State Management:**

```typescript
// Need to track collapse state for 3 levels
const [collapsedL0, setCollapsedL0] = useState<Set<string>>(new Set());
const [collapsedL1, setCollapsedL1] = useState<Set<string>>(new Set());
const [collapsedL2, setCollapsedL2] = useState<Set<string>>(new Set());

// Or unified:
const [collapsedSections, setCollapsedSections] = useState<{
  level0: Set<string>;
  level1: Set<string>;
  level2: Set<string>;
}>({
  level0: new Set(),
  level1: new Set(),
  level2: new Set(),
});
```

---

## 🔧 **Grouping Algorithm:**

```typescript
interface HierarchyNode {
  level0: string;      // Paper name
  level1Items: {
    name: string;      // Main section
    level2Items: {
      name: string;    // Sub-section
      level3Groups: {
        name: string;  // Header (for L4+)
        topics: Topic[];
      }[];
      directTopics: Topic[]; // Level 3 topics (no L4 children)
    }[];
  }[];
}

// Build nested structure
const buildHierarchy = (topics) => {
  // Group by Level 0 first
  const papers = groupBy(topics, 'great_grandparent_name');
  
  // Within each paper, group by Level 1
  papers.forEach(paper => {
    const sections = groupBy(paper.topics, 'grandparent_name');
    
    // Within each section, group by Level 2
    sections.forEach(section => {
      const subsections = groupBy(section.topics, 'parent_name');
      
      // Within each subsection, separate Level 3 vs Level 4+
      subsections.forEach(subsection => {
        const level3Topics = subsection.topics.filter(t => t.topic_level === 3);
        const level4Plus = subsection.topics.filter(t => t.topic_level >= 4);
        
        // Group Level 4+ by their parent (Level 3)
        const level3Headers = groupBy(level4Plus, 'parent_name');
      });
    });
  });
};
```

---

## 🎯 **SIMPLIFIED APPROACH (Recommended):**

Instead of complex nested structures, use **flat grouping with composite keys**:

```typescript
const groupTopicsByHierarchy = (topics: any[]): TopicGroup[] => {
  const groups: Map<string, TopicGroup> = new Map();

  topics.forEach((topic) => {
    const level0 = topic.great_grandparent_name || 'Other';
    const level1 = topic.grandparent_name || '';
    const level2 = topic.parent_name || '';
    const level3 = topic.topic_level >= 4 ? topic.parent_name : '';
    
    // Create hierarchical key
    const key = `${level0}||${level1}||${level2}||${level3}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        level0,
        level1,
        level2: level2 || undefined,
        level3: level3 || undefined,
        topics: [],
      });
    }
    
    groups.get(key)!.topics.push(topic);
  });
  
  return Array.from(groups.values()).sort((a, b) => {
    // Sort by hierarchy
    if (a.level0 !== b.level0) return a.level0.localeCompare(b.level0);
    if (a.level1 !== b.level1) return a.level1.localeCompare(b.level1);
    if (a.level2 !== b.level2) return (a.level2 || '').localeCompare(b.level2 || '');
    return 0;
  });
};
```

---

## 🎨 **Rendering Logic:**

```typescript
// Group groups by Level 0 (Papers)
const paperGroups = groupBy(groupedTopics, 'level0');

paperGroups.forEach(paper => {
  // Render Level 0 header (Paper)
  <CollapseSection level={0} name={paper.name}>
    
    // Group by Level 1 within paper
    const section1Groups = groupBy(paper.groups, 'level1');
    
    section1Groups.forEach(section1 => {
      // Render Level 1 header (Main Section)
      <CollapseSection level={1} name={section1.name}>
        
        // Group by Level 2 within section
        const section2Groups = groupBy(section1.groups, 'level2');
        
        section2Groups.forEach(section2 => {
          // Render Level 2 header (Sub-section)
          <CollapseSection level={2} name={section2.name}>
            
            // Render Level 3 headers (if Level 4+ exists)
            // Render Level 3-5 topic cards
            
          </CollapseSection>
        });
      </CollapseSection>
    });
  </CollapseSection>
});
```

---

## ⏱️ **IMPLEMENTATION TIME:**

This is a **significant refactor** (not just a small fix):
- **Estimate:** 4-6 hours
- **Components:** Grouping logic, state management, rendering, styling

---

## 🤔 **QUESTION FOR YOU:**

Given the complexity, should I:

**A)** Build the complete 4-tier system now (4-6 hours)?  
**B)** Start with 2-tier (L0 + L1) and iterate (2 hours)?  
**C)** Create a demo/prototype first to validate UX (1 hour)?

Also: It's late in this session, would you prefer I:
- Continue now and finish it?
- Create a detailed spec for next session?
- Commit what we have and polish it tomorrow?

Let me know how you'd like to proceed! 🚀





