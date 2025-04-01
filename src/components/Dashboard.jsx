import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const FINNHUB_API_KEY = 'cvdnd11r01qm9khm2im0cvdnd11r01qm9khm2img';
const POLYGON_API_KEY = 'bmWSklm2dvzQM5vzTceto77vuFt58r10';
const NEWS_API_KEY = 'FOAxNDnNslrgqfx6CjQZ3uI23kWe5SHHEueEvjo2';

const dataCache = {};

const Dashboard = ({ user }) => {
  const [stocks, setStocks] = useState([]);
  const [newStock, setNewStock] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userMetadata, setUserMetadata] = useState(null);
  const [activeTab, setActiveTab] = useState('holdings');
  const [monthlyData, setMonthlyData] = useState(null);
  const [newsData, setNewsData] = useState({});
  const [loadingNews, setLoadingNews] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchUserMetadata = async () => {
      try {
        const { data: { user: userData }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUserMetadata(userData.user_metadata || {});
      } catch (err) {
        console.error('Error fetching user metadata:', err);
      }
    };

    fetchUserMetadata();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    const isConfirmed = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
    
    if (isConfirmed) {
      try {
        // First delete all user's stocks
        const { error: stocksError } = await supabase
          .from('user_stocks')
          .delete()
          .eq('user_id', user.id);

        if (stocksError) throw stocksError;

        // Then delete the user
        const { error: userError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (userError) throw userError;

        // Sign out after successful deletion
        await supabase.auth.signOut();
      } catch (err) {
        setError('Failed to delete account: ' + err.message);
      }
    }
  };

  // Function to fetch monthly data for a single stock using Polygon.io
  const fetchMonthlyData = async (symbol, quantity) => {
    try {
      // Check cache first
      if (dataCache[symbol]) {
        console.log(`Using cached data for ${symbol}`);
        return dataCache[symbol].map(item => ({
          ...item,
          value: item.price * quantity
        }));
      }

      // Get today's date and 30 days ago
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      // Format dates as YYYY-MM-DD
      const formatDate = (date) => {
        return date.toISOString().split('T')[0];
      };

      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${formatDate(startDate)}/${formatDate(endDate)}?adjusted=true&sort=asc&limit=120&apiKey=${POLYGON_API_KEY}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`HTTP error for ${symbol}:`, response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      
      if (data.status === 'ERROR' || !data.results || !Array.isArray(data.results)) {
        console.error(`Invalid data for ${symbol}:`, data);
        return [];
      }

      // Cache the base data without quantity multiplication
      dataCache[symbol] = data.results.map(result => ({
        date: new Date(result.t).toISOString().split('T')[0],
        price: result.c // Store base price
      }));

      // Return data with quantity applied
      return dataCache[symbol].map(item => ({
        date: item.date,
        value: item.price * quantity
      }));

    } catch (err) {
      console.error(`Error fetching data for ${symbol}:`, err);
      return [];
    }
  };

  // Function to fetch news for stocks
  const fetchNewsForStocks = async (symbols) => {
    if (!symbols || symbols.length === 0) return;
    
    setLoadingNews(true);
    setIsRefreshing(true);
    try {
      /* TEMPORARILY DISABLED LIVE NEWS API TO SAVE CREDITS
      const mockNews = symbols.reduce((acc, symbol) => {
        acc[symbol] = [{
          title: 'News API temporarily disabled',
          url: '#',
          text: 'News feed is temporarily disabled to preserve API credits during development. The news API will be re-enabled before deployment.',
          image: 'https://via.placeholder.com/300x200?text=News+Disabled',
          publishedDate: new Date().toISOString(),
          site: 'System Message'
        }];
        return acc;
      }, {});

      setNewsData(mockNews);
      */ 
      // Start Live Production
      const newsPromises = symbols.map(async (symbol) => {
        const url = `https://api.thenewsapi.com/v1/news/all?api_token=${NEWS_API_KEY}&search=${symbol}&language=en&limit=3&sort=published_at`;
        console.log(`Fetching news for ${symbol} from:`, url);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data.data || !Array.isArray(data.data)) {
          console.error(`Invalid news data for ${symbol}:`, data);
          return { [symbol]: [] };
        }

        const articles = data.data.map(item => ({
          title: item.title,
          url: item.url,
          text: item.description || item.snippet,
          image: item.image_url || 'https://via.placeholder.com/300x200?text=No+Image',
          publishedDate: item.published_at,
          site: item.source
        }));

        return { [symbol]: articles };
      });

      const newsResults = await Promise.all(newsPromises);
      const combinedNews = newsResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      
      setNewsData(combinedNews);
      // End Live Production
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to fetch news data');
    } finally {
      setLoadingNews(false);
      setIsRefreshing(false);
    }
  };

  // Fetch user's saved stocks from Supabase
  const fetchUserStocks = async (isInitialLoad = false) => {
    try {
      const { data, error } = await supabase
        .from('user_stocks')
        .select('stock_symbol, quantity')
        .eq('user_id', user.id);

      if (error) throw error;

      // Fetch stock data for each symbol
      const stockData = await Promise.all(
        data.map(async ({ stock_symbol, quantity }) => {
          const response = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${stock_symbol}&token=${FINNHUB_API_KEY}`
          );
          const quoteData = await response.json();
          
          // Get company name
          const companyResponse = await fetch(
            `https://finnhub.io/api/v1/stock/profile2?symbol=${stock_symbol}&token=${FINNHUB_API_KEY}`
          );
          const companyData = await companyResponse.json();

          return {
            symbol: stock_symbol,
            quantity: quantity || 0,
            name: companyData.name || stock_symbol,
            currentPrice: quoteData.c,
            change: quoteData.d,
            percentChange: quoteData.dp,
            high: quoteData.h,
            low: quoteData.l,
            open: quoteData.o,
            previousClose: quoteData.pc,
            totalValue: (quoteData.c * (quantity || 0)).toFixed(2)
          };
        })
      );

      setStocks(stockData);
      
      // Only fetch news on initial load
      if (isInitialLoad && Object.keys(newsData).length === 0) {
        const uniqueSymbols = [...new Set(stockData.map(stock => stock.symbol))];
        fetchNewsForStocks(uniqueSymbols);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Add new stock to user's dashboard
  const addStock = async (e) => {
    e.preventDefault();
    if (!newStock) return;

    try {
      const { error } = await supabase
        .from('user_stocks')
        .insert([
          { 
            user_id: user.id, 
            stock_symbol: newStock.toUpperCase(),
            quantity: 1  // Default to 1
          }
        ]);

      if (error) throw error;

      setNewStock('');
      fetchUserStocks();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateQuantity = async (e, symbol, currentQuantity, increment) => {
    e.preventDefault(); // Prevent event bubbling
    e.stopPropagation(); // Stop event propagation
    
    const newQuantity = currentQuantity + increment;
    if (newQuantity < 1) return; // Prevent quantity less than 1

    try {
      // Optimistically update the UI
      setStocks(stocks.map(stock => 
        stock.symbol === symbol 
          ? { 
              ...stock, 
              quantity: newQuantity,
              totalValue: (stock.currentPrice * newQuantity).toFixed(2)
            }
          : stock
      ));

      // Update in Supabase
      const { error } = await supabase
        .from('user_stocks')
        .update({ quantity: newQuantity })
        .eq('user_id', user.id)
        .eq('stock_symbol', symbol);

      if (error) {
        throw error;
      }
    } catch (err) {
      // If there's an error, revert the optimistic update
      setError(err.message);
      setStocks(stocks.map(stock => 
        stock.symbol === symbol 
          ? { 
              ...stock, 
              quantity: currentQuantity,
              totalValue: (stock.currentPrice * currentQuantity).toFixed(2)
            }
          : stock
      ));
    }
  };

  // Remove stock from dashboard
  const removeStock = async (symbol) => {
    try {
      const { error } = await supabase
        .from('user_stocks')
        .delete()
        .eq('user_id', user.id)
        .eq('stock_symbol', symbol);

      if (error) throw error;

      fetchUserStocks();
    } catch (err) {
      setError(err.message);
    }
  };

  // Add handleRefreshNews function
  const handleRefreshNews = async () => {
    const uniqueSymbols = [...new Set(stocks.map(stock => stock.symbol))];
    await fetchNewsForStocks(uniqueSymbols);
  };

  // Initialize chart configuration
  const chartConfig = {
    type: 'line',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: 'white'
          }
        },
        title: {
          display: true,
          text: '30-Day Portfolio Performance',
          color: 'white',
          font: {
            size: 16
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'white',
            maxTicksLimit: 10
          }
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'white',
            callback: (value) => '$' + value.toLocaleString()
          }
        }
      }
    }
  };

  // Update useEffect for chart data
  useEffect(() => {
    let isMounted = true;

    const updateChart = async () => {
      if (stocks && stocks.length > 0) {
        try {
          // Show loading state only on initial load
          if (!monthlyData) {
            setMonthlyData({ loading: true });
          }

          // Fetch data for all stocks concurrently
          const stockDataPromises = stocks.map(stock => 
            fetchMonthlyData(stock.symbol, stock.quantity)
          );

          const results = await Promise.all(stockDataPromises);

          if (!isMounted) return;

          // Combine all valid data points
          const combinedData = {};
          results.forEach((stockData, index) => {
            if (!stockData.length) return;
            
            stockData.forEach(({ date, value }) => {
              combinedData[date] = (combinedData[date] || 0) + value;
            });
          });

          const sortedDates = Object.keys(combinedData).sort();
          
          if (sortedDates.length === 0) {
            setMonthlyData(null);
            return;
          }

          const values = sortedDates.map(date => combinedData[date]);
          const lowestValue = Math.min(...values);
          const highestValue = Math.max(...values);
          const yAxisPadding = (highestValue - lowestValue) * 0.05;

          const chartData = {
            labels: sortedDates.map(date => new Date(date).toLocaleDateString()),
            datasets: [{
              label: 'Portfolio Value',
              data: sortedDates.map(date => parseFloat(combinedData[date].toFixed(2))),
              borderColor: 'rgb(220, 38, 38)',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              tension: 0.4,
              fill: true
            }]
          };

          setMonthlyData({
            ...chartData,
            options: {
              ...chartConfig.options,
              animation: {
                duration: 0 // Disable animations for faster rendering
              },
              scales: {
                ...chartConfig.options.scales,
                y: {
                  ...chartConfig.options.scales.y,
                  beginAtZero: false,
                  min: Math.floor(lowestValue - yAxisPadding),
                  max: Math.ceil(highestValue + yAxisPadding),
                  ticks: {
                    callback: (value) => '$' + value.toLocaleString()
                  }
                }
              }
            }
          });
        } catch (err) {
          console.error('Error updating chart:', err);
          if (isMounted) {
            setMonthlyData(null);
          }
        }
      } else {
        setMonthlyData(null);
      }
    };

    updateChart();

    return () => {
      isMounted = false;
    };
  }, [stocks]);

  // Chart component with optimized rendering
  const renderChart = () => {
    if (!monthlyData) {
      return <div className="loading-message">Loading monthly performance chart...</div>;
    }

    if (monthlyData.loading) {
      return <div className="loading-message">Fetching latest stock data...</div>;
    }

    if (!monthlyData.datasets || !monthlyData.datasets[0] || !monthlyData.datasets[0].data || monthlyData.datasets[0].data.length === 0) {
      return <div className="loading-message">No data available for chart</div>;
    }

    return (
      <Line
        data={{
          labels: monthlyData.labels,
          datasets: monthlyData.datasets
        }}
        options={monthlyData.options || chartConfig.options}
        height={240} // Increased from 200
      />
    );
  };

  useEffect(() => {
    fetchUserStocks(true); // Pass true for initial load
    const interval = setInterval(() => fetchUserStocks(false), 60000); // Pass false for interval updates
    return () => clearInterval(interval);
  }, [user.id]);

  if (loading) return (
    <div className="loading">
      <div className="loading-content">
        Loading your dashboard...
      </div>
    </div>
  );
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>{userMetadata?.full_name ? `${userMetadata.full_name.split(' ')[0]}'s Stock Dashboard` : 'Your Stock Dashboard'}</h2>
        </div>
        <nav className="dashboard-nav">
          <button 
            className={`nav-item ${activeTab === 'holdings' ? 'active' : ''}`}
            onClick={() => setActiveTab('holdings')}
          >
            <div className="nav-item-content">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 11h2v2H2v-2zm2-2H2V7h2v2zm0-4H2V3h2v2zm4 8H6v-2h2v2zm0-4H6V7h2v2zm0-4H6V3h2v2zm4 8h-2v-2h2v2zm0-4h-2V7h2v2zm0-4h-2V3h2v2zm4 8h-2v-2h2v2zm0-4h-2V7h2v2zm0-4h-2V3h2v2z"/>
              </svg>
              <span>Holdings</span>
            </div>
          </button>
          <button 
            className={`nav-item ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => setActiveTab('news')}
          >
            <div className="nav-item-content">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
              <span>News</span>
            </div>
          </button>
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <div className="nav-item-content">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <span>Profile</span>
            </div>
          </button>
        </nav>
      </div>

      <div className={`holdings-section ${activeTab === 'holdings' ? 'active' : ''}`}>
        <div className="chart-container">
          {renderChart()}
        </div>
        
        <div className="stock-form-container">
          <form onSubmit={addStock} className="stock-input-group">
            <input
              type="text"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              placeholder="Enter stock symbol (e.g., AAPL)"
              className="stock-input"
            />
            <button type="submit" className="add-stock-button">Add Stock</button>
          </form>
        </div>

        <div className="stocks-grid">
          {stocks.map((stock) => (
            <div key={stock.symbol} className="stock-card">
              <div className="stock-card-header">
                <div>
                  <h3>{stock.symbol}</h3>
                  <p className="company-name">{stock.name}</p>
                </div>
                <button
                  onClick={() => removeStock(stock.symbol)}
                  className="remove-stock"
                >
                  ×
                </button>
              </div>
              <div className="stock-price">
                ${stock.currentPrice.toFixed(2)}
                <span className={`price-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                  {stock.change >= 0 ? '▲' : '▼'} ${Math.abs(stock.change).toFixed(2)} ({stock.percentChange.toFixed(2)}%)
                </span>
              </div>
              <div className="stock-details">
                <div className="detail-row">
                  <span>Quantity</span>
                  <div className="quantity-controls">
                    <button 
                      className="quantity-button"
                      onClick={(e) => updateQuantity(e, stock.symbol, stock.quantity, -1)}
                    >
                      -
                    </button>
                    <span className="quantity-display">{stock.quantity}</span>
                    <button 
                      className="quantity-button"
                      onClick={(e) => updateQuantity(e, stock.symbol, stock.quantity, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="detail-row">
                  <span>Total Value</span>
                  <span>${stock.totalValue}</span>
                </div>
                <div className="detail-row">
                  <span>Open</span>
                  <span>${stock.open.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span>High</span>
                  <span>${stock.high.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span>Low</span>
                  <span>${stock.low.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span>Prev Close</span>
                  <span>${stock.previousClose.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`news-section ${activeTab === 'news' ? 'active' : ''}`}>
        <div className="news-section-header">
          <button 
            className={`refresh-button ${isRefreshing ? 'spinning' : ''}`}
            onClick={handleRefreshNews}
            disabled={isRefreshing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        {loadingNews ? (
          <div className="loading-content" style={{ margin: '2rem auto', maxWidth: '600px' }}>
            Loading news...
          </div>
        ) : stocks.length === 0 ? (
          <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '2rem' }}>
            Add stocks to see related news
          </p>
        ) : (
          <div className="news-grid">
            {stocks.map((stock) => (
              <div key={stock.symbol} className="news-section-stock">
                <h3 className="news-section-title">{stock.symbol} - Latest News</h3>
                <div className="news-cards">
                  {newsData[stock.symbol]?.length > 0 ? (
                    newsData[stock.symbol].map((news, index) => (
                      <a 
                        key={index} 
                        href={news.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="news-card"
                      >
                        <div className="news-image">
                          <img src={news.image} alt={news.title} />
                        </div>
                        <div className="news-content">
                          <h4>{news.title}</h4>
                          <p>{news.text}</p>
                          <div className="news-meta">
                            <span>{new Date(news.publishedDate).toLocaleDateString()}</span>
                            <span>{news.site}</span>
                          </div>
                        </div>
                      </a>
                    ))
                  ) : (
                    <p className="no-news">No recent news available for {stock.symbol}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`profile-section ${activeTab === 'profile' ? 'active' : ''}`}>
        <div className="profile-content">
          <h3 className="profile-name">{userMetadata?.full_name || 'User'}</h3>
          <div className="profile-buttons">
            <button onClick={handleSignOut} className="sign-out-button">
              Sign Out
            </button>
            <button 
              onClick={handleDeleteAccount} 
              className="delete-account-button"
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                marginTop: '1rem',
                width: '100%',
                fontWeight: '500',
                transition: 'background-color 0.2s',
              }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 
