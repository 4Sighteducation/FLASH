# 🎯 Contextual Search UI Implementation Guide

## The User Flow That Works

### 1️⃣ **Onboarding Captures Context FIRST**
```javascript
// User selects during onboarding:
const userProfile = {
  exam_board: 'Edexcel',
  qualification_level: 'GCSE',
  subjects: [
    'Biology (GCSE)',
    'Chemistry (GCSE)',
    'Physics (GCSE)'
  ]
};
```

### 2️⃣ **Search Screen Pre-Filters by Default**
```jsx
// TopicSearchScreen.tsx
const TopicSearchScreen = ({ route }) => {
  const { userProfile } = route.params;
  
  // Default to user's current subject
  const [selectedSubject, setSelectedSubject] = useState(userProfile.subjects[0]);
  
  // Search ALWAYS includes context
  const searchTopics = async (query) => {
    const results = await supabase.rpc('match_topics', {
      query_embedding: await getEmbedding(query),
      p_exam_board: userProfile.exam_board,
      p_qualification_level: userProfile.qualification_level,
      p_subject_name: selectedSubject,
      p_limit: 20  // Get more results due to low confidence
    });
    
    return results;
  };
```

### 3️⃣ **UI Shows Context Clearly**
```jsx
return (
  <SafeAreaView style={styles.container}>
    {/* Show active filters */}
    <View style={styles.contextBar}>
      <Text style={styles.contextText}>
        Searching in: {selectedSubject}
      </Text>
      <Text style={styles.contextSubtext}>
        {userProfile.exam_board} {userProfile.qualification_level}
      </Text>
    </View>
    
    {/* Search bar */}
    <NeonSearchBar 
      placeholder={`Search ${selectedSubject} topics...`}
      onSearch={searchTopics}
    />
    
    {/* Subject switcher */}
    <ScrollView horizontal style={styles.subjectTabs}>
      {userProfile.subjects.map(subject => (
        <TouchableOpacity 
          key={subject}
          onPress={() => setSelectedSubject(subject)}
          style={[
            styles.tab,
            selectedSubject === subject && styles.activeTab
          ]}
        >
          <Text style={styles.tabText}>{subject}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
    
    {/* Results with fallbacks */}
    <SearchResults 
      results={searchResults}
      showBrowseOption={true}  // Always show browse as fallback
      minConfidence={0}  // Show all results, even low confidence
    />
  </SafeAreaView>
);
```

## 🎨 The Hybrid Approach

### **Search + Browse Combined**
```jsx
const TopicExplorer = () => {
  const [mode, setMode] = useState('search'); // 'search' or 'browse'
  
  return (
    <View>
      {/* Mode switcher */}
      <View style={styles.modeSwitcher}>
        <TouchableOpacity 
          onPress={() => setMode('search')}
          style={mode === 'search' && styles.activeMode}
        >
          <Icon name="search" />
          <Text>Search</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setMode('browse')}
          style={mode === 'browse' && styles.activeMode}
        >
          <Icon name="folder" />
          <Text>Browse</Text>
        </TouchableOpacity>
      </View>
      
      {mode === 'search' ? (
        <ContextualSearch userProfile={userProfile} />
      ) : (
        <HierarchicalBrowser 
          examBoard={userProfile.exam_board}
          level={userProfile.qualification_level}
          subject={selectedSubject}
        />
      )}
    </View>
  );
};
```

## 📊 Handling Low Confidence Results

### **1. Show More Results**
Since confidence is low, show 15-20 results instead of 5.

### **2. Add Secondary Indicators**
```jsx
const TopicResult = ({ topic }) => {
  // Calculate relevance indicators
  const hasKeywordMatch = searchQuery && 
    topic.plain_english_summary.toLowerCase().includes(searchQuery.toLowerCase());
  
  const isHighImportance = topic.exam_importance > 0.8;
  const isCoreTopic = topic.difficulty_band === 'core';
  
  return (
    <View style={styles.resultCard}>
      <Text style={styles.topicPath}>
        {topic.full_path.join(' > ')}
      </Text>
      
      <Text style={styles.summary}>
        {topic.plain_english_summary}
      </Text>
      
      <View style={styles.indicators}>
        {hasKeywordMatch && (
          <Badge text="Keyword Match" color="#00ff00" />
        )}
        {isHighImportance && (
          <Badge text="High Priority" color="#ff00ff" />
        )}
        {isCoreTopic && (
          <Badge text="Core Topic" color="#00ffff" />
        )}
      </View>
    </View>
  );
};
```

## 🔄 Fallback Strategy

### **When Search Fails → Suggest Browse**
```jsx
const NoResultsFallback = ({ searchQuery, onBrowse }) => (
  <View style={styles.fallback}>
    <Text style={styles.fallbackTitle}>
      No exact matches for "{searchQuery}"
    </Text>
    
    <Text style={styles.fallbackSubtitle}>
      Try these options:
    </Text>
    
    <TouchableOpacity 
      style={styles.browseButton}
      onPress={onBrowse}
    >
      <Text>Browse all {selectedSubject} topics</Text>
    </TouchableOpacity>
    
    <View style={styles.suggestions}>
      <Text style={styles.suggestionTitle}>Suggested searches:</Text>
      {getSuggestedSearches(searchQuery).map(suggestion => (
        <TouchableOpacity key={suggestion}>
          <Text style={styles.suggestion}>{suggestion}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);
```

## 🚀 Implementation Priority

### **Phase 1: MVP (Week 1)**
1. ✅ Contextual search with user's course details
2. ✅ Show 20 results regardless of confidence
3. ✅ Add "Browse Topics" button as fallback

### **Phase 2: Enhancement (Week 2)**
1. Add keyword highlighting in results
2. Implement browse mode with hierarchy
3. Add "suggested searches" based on common terms

### **Phase 3: Post-Launch**
1. Track search terms that return poor results
2. Regenerate embeddings with topic names included
3. Add user feedback ("Was this helpful?")

## 💡 Key Insights

### **Always Use Context**
```javascript
// NEVER do this:
const results = await searchTopics(query); // No context

// ALWAYS do this:
const results = await searchTopics(query, {
  exam_board: user.exam_board,
  qualification_level: user.level,
  subject_name: user.current_subject
});
```

### **Subject Names Include Qualification**
```javascript
// WRONG:
subject_name: 'Biology'

// CORRECT:
subject_name: 'Biology (GCSE)'
subject_name: 'Biology (A-Level)'
```

### **Performance Metrics**
- With context: **200-1000ms** ✅
- Without context: **Timeout** ❌
- Optimal batch size: **20 results**

## 🎯 Success Metrics

Track these to measure search quality:
1. **Click-through rate** on search results
2. **Fallback to browse** percentage
3. **Search abandonment** rate
4. **Time to find topic** (search vs browse)

## 🔮 Future Improvements

### **For Better Relevance:**
1. **Regenerate embeddings** including topic name + code + path
2. **Add keyword search** as parallel option
3. **Fine-tune model** on your curriculum data
4. **User feedback loop** to improve ranking

### **Example Regeneration Approach:**
```javascript
// Instead of just embedding the summary:
const textToEmbed = summary;

// Embed a richer text:
const textToEmbed = `
  Topic: ${topic.topic_name}
  Path: ${topic.full_path.join(' > ')}
  Code: ${topic.topic_code}
  Summary: ${summary}
  Keywords: ${extractKeywords(topic.topic_name)}
`;
```

This will dramatically improve search relevance!











