
// WordPress News Aggregator
// developed by Tawhidur Rahman Dear, https://www.tawhidurrahmandear.com
// Live Preview available at https://www.devilhunter.net/2026/01/wordpress-news-aggregator.html 


// ==============================
// CONFIGURATION SETTINGS
// ==============================
const BLOG = 'reviewofconstitutions.wordpress.com'; // CHANGE TO YOUR BLOG ADDRESS
const POSTS_PER_PAGE = 20;           // Posts to show per page
const TOTAL_MAX_POSTS = 200;         // Maximum total posts to fetch (set to high number for all posts)
const SHOW_THUMBNAILS = true;        // true = show thumbnails, false = hide thumbnails
const SORT_ORDER = 'desc';           // 'asc' = oldest first, 'desc' = newest first
// ==============================

let allPosts = [];
let currentPage = 1;
let totalPages = 1;

async function loadAllPosts() {
    document.getElementById("posts-container").innerHTML = "Loading ...";
    
    let page = 1;
    allPosts = [];
    
    try {
        while (true) {
            // Stop if we've reached the maximum posts limit
            if (allPosts.length >= TOTAL_MAX_POSTS) {
                allPosts = allPosts.slice(0, TOTAL_MAX_POSTS);
                break;
            }
            
            // Calculate how many posts to fetch in this batch
            const remainingPosts = TOTAL_MAX_POSTS - allPosts.length;
            const fetchCount = Math.min(100, remainingPosts);
            
            // Fetch posts from WordPress.com API
            const res = await fetch(
                "https://public-api.wordpress.com/rest/v1.1/sites/" + BLOG + "/posts?number=" + fetchCount + "&page=" + page
            );
            const data = await res.json();
            
            if (!data.posts || data.posts.length === 0) break;
            
            allPosts.push(...data.posts);
            
            // Break if we got fewer posts than requested (reached end)
            if (data.posts.length < fetchCount) break;
            
            page++;
            
            // Update loading message
            document.getElementById("posts-container").innerHTML = 
                "Loaded ...";
            
            // Small delay to avoid overwhelming the API
            await new Promise(r => setTimeout(r, 200));
            
            // Break if we've reached the maximum
            if (allPosts.length >= TOTAL_MAX_POSTS) {
                allPosts = allPosts.slice(0, TOTAL_MAX_POSTS);
                break;
            }
        }
        
        // Sort posts by date based on config
        sortPostsByDate(SORT_ORDER);
        
    } catch (error) {
        console.error("WordPress.com API error, trying WordPress.org...", error);
        // Try WordPress.org REST API
        tryWordPressOrgAPI();
    }
}

// Try WordPress.org REST API
async function tryWordPressOrgAPI() {
    try {
        document.getElementById("posts-container").innerHTML = "Trying WordPress.org API...";
        
        allPosts = [];
        let page = 1;
        
        while (allPosts.length < TOTAL_MAX_POSTS) {
            // Calculate how many posts to fetch
            const remainingPosts = TOTAL_MAX_POSTS - allPosts.length;
            const fetchCount = Math.min(100, remainingPosts);
            
            // Try to get posts from WordPress.org REST API
            const res = await fetch(
                window.location.origin + "/wp-json/wp/v2/posts?per_page=" + fetchCount + "&page=" + page
            );
            
            if (!res.ok) throw new Error("HTTP error! status: " + res.status);
            
            const posts = await res.json();
            
            if (!posts || posts.length === 0) break;
            
            // Convert WordPress.org format to match WordPress.com format
            const convertedPosts = await Promise.all(posts.map(async (post) => {
                let featuredImageUrl = "";
                let firstImageFromContent = "";
                
                // Try to get featured image first
                if (post.featured_media) {
                    try {
                        const mediaRes = await fetch(
                            window.location.origin + "/wp-json/wp/v2/media/" + post.featured_media
                        );
                        if (mediaRes.ok) {
                            const mediaData = await mediaRes.json();
                            featuredImageUrl = mediaData.source_url || "";
                        }
                    } catch (e) {
                        console.warn("Could not fetch featured image:", e);
                    }
                }
                
                // If no featured image, try to extract first image from content
                if (!featuredImageUrl && post.content && post.content.rendered) {
                    const imgMatch = post.content.rendered.match(/<img[^>]+src="([^">]+)"/);
                    if (imgMatch && imgMatch[1]) {
                        firstImageFromContent = imgMatch[1];
                    }
                }
                
                return {
                    title: post.title.rendered,
                    excerpt: post.excerpt.rendered,
                    content: post.content.rendered,
                    URL: post.link,
                    featured_image: featuredImageUrl ? {
                        URL: featuredImageUrl
                    } : null,
                    first_image: firstImageFromContent,
                    date: post.date
                };
            }));
            
            allPosts.push(...convertedPosts);
            
            if (posts.length < fetchCount) break;
            page++;
            
            // Update loading message
            document.getElementById("posts-container").innerHTML = 
                "Loaded " + allPosts.length + " posts...";
            
            await new Promise(r => setTimeout(r, 200));
        }
        
        // Limit to maximum posts
        if (allPosts.length > TOTAL_MAX_POSTS) {
            allPosts = allPosts.slice(0, TOTAL_MAX_POSTS);
        }
        
        // Sort posts by date based on config
        sortPostsByDate(SORT_ORDER);
        
    } catch (error) {
        console.error("WordPress.org API also failed:", error);
        document.getElementById("posts-container").innerHTML = 
            "<p style='color: red;'>Error loading posts. Please check your blog URL and CORS settings.</p>" +
            "<p>Make sure to update the BLOG address in the configuration section.</p>";
    }
}

// Extract first image from post content (for WordPress.com posts)
function extractFirstImageFromContent(content) {
    if (!content) return "";
    
    // Look for image tags in the content
    const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
    return imgMatch && imgMatch[1] ? imgMatch[1] : "";
}

// Sort posts by publish date
function sortPostsByDate(order) {
    if (allPosts.length === 0) return;
    
    // Sort the array by date
    allPosts.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (order === "asc") {
            return dateA - dateB;  // Oldest first
        } else {
            return dateB - dateA;  // Newest first
        }
    });
    
    // Reset to page 1 and display
    currentPage = 1;
    displayPage();
}

// Get excerpt (plain text, max 200 characters)
function getExcerpt(content, maxLength = 200) {
    if (!content) return "";
    
    // Remove HTML tags
    let text = content.replace(/<[^>]*>/g, "");
    
    // Decode HTML entities
    const textArea = document.createElement("textarea");
    textArea.innerHTML = text;
    text = textArea.value;
    
    // Trim and limit length
    text = text.trim();
    if (text.length > maxLength) {
        text = text.substring(0, maxLength) + "...";
    }
    
    return text;
}

// Display current page
function displayPage() {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const pagePosts = allPosts.slice(start, end);
    
    let html = "";
    
    pagePosts.forEach(post => {
        // Get image URL - check in order: featured image, first_image from content
        let imageUrl = "";
        if (SHOW_THUMBNAILS) {
            // For WordPress.com posts
            if (post.featured_image && post.featured_image.URL) {
                imageUrl = post.featured_image.URL;
            } 
            // For WordPress.org converted posts with featured image
            else if (post.featured_image && typeof post.featured_image === "string") {
                imageUrl = post.featured_image;
            }
            // For WordPress.com posts - extract first image from content
            else if (post.content) {
                imageUrl = extractFirstImageFromContent(post.content);
            }
            // For WordPress.org converted posts with first_image
            else if (post.first_image) {
                imageUrl = post.first_image;
            }
        }
        
        // Generate thumbnail HTML if we have an image
        let thumbnailHtml = "";
        if (imageUrl) {
            thumbnailHtml = 
                "<div class='wordpress-post-thumbnail'>" +
                    "<img src='" + imageUrl + "' alt='" + post.title + "' onerror='this.style.display=\"none\"'>" +
                "</div>";
        }
        
        // Get excerpt
        let excerpt = "";
        if (post.excerpt) {
            excerpt = getExcerpt(post.excerpt);
        } else if (post.content) {
            excerpt = getExcerpt(post.content);
        }
        
        html += 
            "<div class='wordpress-post clearfix'>" +
                "<h3 class='wordpress-post-title'>" +
                    "<a href='" + post.URL + "' target='_blank' rel='noopener'>" + post.title + "</a>" +
                "</h3>" +
                thumbnailHtml +
                (excerpt ? "<div class='wordpress-post-excerpt'>" + excerpt + "</div>" : "") +
                "<a href='" + post.URL + "' class='wordpress-post-read-more' target='_blank' rel='noopener'>Read More ... </a>" +
            "</div>";
    });
    
    document.getElementById("posts-container").innerHTML = html;
    updatePagination();
}

// Update pagination buttons
function updatePagination() {
    totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
    const pagination = document.getElementById("pagination");
    
    let html = "";
    
    if (totalPages > 1) {
        // Previous button
        html += "<button class='page-btn' onclick='changePage(" + (currentPage - 1) + ")' " +
                (currentPage === 1 ? "disabled" : "") + ">◀</button>";
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                html += "<button class='page-btn current-page'>" + i + "</button>";
            } else if (i === 1 || i === totalPages || 
                      (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += "<button class='page-btn' onclick='changePage(" + i + ")'>" + i + "</button>";
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += "<span style='padding: 8px 5px;'>...</span>";
            }
        }
        
        // Next button
        html += "<button class='page-btn' onclick='changePage(" + (currentPage + 1) + ")' " +
                (currentPage === totalPages ? "disabled" : "") + ">▶</button>";
    }
    
    pagination.innerHTML = html;
}

// Change page
function changePage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    displayPage();
    window.scrollTo(0, 0);
}

// Start loading when page loads
document.addEventListener("DOMContentLoaded", loadAllPosts);