package config

import (
	"encoding/json"
	"log"
	"os"
)

type Config struct {
	Port          string `json:"port"`
	LogPath       string `json:"log_path"`
	CredentialsDB string `json:"credentials_db"`
	UseHTTPS      bool   `json:"use_https"`
	CertFile      string `json:"cert_file"`
	KeyFile       string `json:"key_file"`
}

// LoadConfig 从文件加载配置或使用默认值
func LoadConfig() *Config {
	config := &Config{
		Port:          "8080",
		LogPath:       "aws-ip-manager.log",
		CredentialsDB: "credentials.db",
		UseHTTPS:      false,
		CertFile:      "",
		KeyFile:       "",
	}
	
	// 尝试从配置文件加载
	file, err := os.Open("config.json")
	if err != nil {
		log.Println("未找到配置文件，使用默认配置")
		return config
	}
	defer file.Close()
	
	decoder := json.NewDecoder(file)
	err = decoder.Decode(config)
	if err != nil {
		log.Printf("解析配置文件错误: %v, 使用默认配置", err)
	}
	
	return config
} 