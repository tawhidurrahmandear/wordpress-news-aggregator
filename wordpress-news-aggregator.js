// WordPress News Aggregator
// developed by Tawhidur Rahman Dear, https://www.tawhidurrahmandear.com
// Live Preview available at https://tawhidurrahmandear.github.io/wordpress-news-aggregator/




         // CONFIG - CHANGE THIS!
        const BLOG = 'reviewofconstitutions.wordpress.com'; // BLOG ADDRESS
        const POSTS_PER_PAGE = 100;  // Total Posts per page
        
		
		
        let allPosts = [];
        let currentPage = 1;
        let totalPages = 1;

        async function loadAllPosts() {
            document.getElementById('posts-container').innerHTML = 'Loading posts...';
            
            let page = 1;
            allPosts = [];
            
            try {
                while (true) {
                    // Fetch posts (no sorting in API - we'll sort manually)
                    const res = await fetch(
                        `https://public-api.wordpress.com/rest/v1.1/sites/${BLOG}/posts?number=100&page=${page}`
                    );
                    const data = await res.json();
                    
                    if (!data.posts || data.posts.length === 0) break;
                    
                    allPosts.push(...data.posts);
                    
                    if (data.posts.length < 100) break;
                    page++;
                    
                    document.getElementById('posts-container').innerHTML = 
                        `Loaded ${allPosts.length} posts...`;
                    
                    await new Promise(r => setTimeout(r, 200));
                }
                
                // Sort A-Z by default
                sortPosts('asc');
                
            } catch (error) {
                document.getElementById('posts-container').innerHTML = 
                    `<p style="color: red;">Error: ${error.message}</p>`;
            }
        }
        
        // Sort posts manually (guaranteed to work)
        function sortPosts(order) {
            if (allPosts.length === 0) return;
            
            // Sort the array
            allPosts.sort((a, b) => {
                const titleA = a.title.toLowerCase();
                const titleB = b.title.toLowerCase();
                
                if (order === 'asc') {
                    return titleA.localeCompare(titleB);
                } else {
                    return titleB.localeCompare(titleA);
                }
            });
            
            // Reset to page 1 and display
            currentPage = 1;
            displayPage();
        }
        
        // Display current page
        function displayPage() {
            const start = (currentPage - 1) * POSTS_PER_PAGE;
            const end = start + POSTS_PER_PAGE;
            const pagePosts = allPosts.slice(start, end);
            
            let html = '';
            
            pagePosts.forEach(post => {
                const date = new Date(post.date).toLocaleDateString();
                
                html += `
                    <div class="post">
                        <h3 class="post-title">
                            <a href="${post.URL}">${post.title}</a>
                        </h3>
                    </div>
                `;
            });
            
            document.getElementById('posts-container').innerHTML = html;
            document.getElementById('page-info').textContent = 
                `${start + 1}-${Math.min(end, allPosts.length)} of ${allPosts.length}`;
            
            updatePagination();
        }
        
        // Update pagination buttons
        function updatePagination() {
            totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
            const pagination = document.getElementById('pagination');
            
            let html = '';
            
            if (totalPages > 1) {
                // Previous button
                html += `<button class="page-btn" onclick="changePage(${currentPage - 1})" 
                        ${currentPage === 1 ? 'disabled' : ''}>◀</button>`;
                
                // Page numbers
                for (let i = 1; i <= totalPages; i++) {
                    if (i === currentPage) {
                        html += `<button class="page-btn current-page">${i}</button>`;
                    } else if (i === 1 || i === totalPages || 
                              (i >= currentPage - 2 && i <= currentPage + 2)) {
                        html += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
                    } else if (i === currentPage - 3 || i === currentPage + 3) {
                        html += `<span>...</span>`;
                    }
                }
                
                // Next button
                html += `<button class="page-btn" onclick="changePage(${currentPage + 1})" 
                        ${currentPage === totalPages ? 'disabled' : ''}>▶</button>`;
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
        document.addEventListener('DOMContentLoaded', loadAllPosts);