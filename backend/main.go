package main

import (
	"log"
	"net/http"
	"os"
	
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
	"aws-ip-manager/backend/handlers"
	"aws-ip-manager/backend/config"
)

func main() {
	// 加载配置
	cfg := config.LoadConfig()
	
	// 设置日志
	f, err := os.OpenFile(cfg.LogPath, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("无法打开日志文件: %v", err)
	}
	defer f.Close()
	log.SetOutput(f)
	
	// 创建路由
	router := gin.Default()
	
	// 配置CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))
	
	// 提供静态文件
	router.Static("/static", "./frontend")
	router.LoadHTMLGlob("frontend/*.html")
	
	// 主页
	router.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})
	
	// API路由
	api := router.Group("/api")
	{
		// 凭证管理
		api.GET("/credentials", handlers.GetAllCredentials)
		api.POST("/credentials", handlers.AddCredential)
		api.GET("/credentials/:id", handlers.GetCredential)
		api.DELETE("/credentials/:id", handlers.DeleteCredential)
		
		// EC2实例管理
		api.GET("/instances", handlers.ListInstances)
		api.GET("/instances/:id", handlers.GetInstanceDetails)
		
		// IP管理
		api.POST("/instances/:id/allocate-eip", handlers.AllocateEIP)
		api.POST("/instances/:id/release-eip", handlers.ReleaseEIP)
		api.POST("/instances/:id/associate-eip", handlers.AssociateEIP)
		api.POST("/instances/:id/disassociate-eip", handlers.DisassociateEIP)
	}
	
	// 启动服务器
	log.Printf("服务器启动在 %s 端口\n", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("无法启动服务器: %v", err)
	}
} 