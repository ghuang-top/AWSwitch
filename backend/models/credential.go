package models

import (
	"encoding/json"
	"errors"
	"os"
	"sync"
	"time"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"io"
)

// Credential 代表一组AWS凭证
type Credential struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	AccessKey string    `json:"access_key"`
	SecretKey string    `json:"secret_key,omitempty"` // 响应中不包含
	Region    string    `json:"region"`
	CreatedAt time.Time `json:"created_at"`
}

var (
	credentials []Credential
	mu          sync.RWMutex
	dbFile      string
	encryptKey  = []byte("aws-ip-manager-encryption-key-32b") // 32字节AES密钥
)

// InitCredentialStore 初始化凭证存储
func InitCredentialStore(file string) error {
	dbFile = file
	return loadCredentials()
}

// 从文件加载凭证
func loadCredentials() error {
	mu.Lock()
	defer mu.Unlock()
	
	data, err := os.ReadFile(dbFile)
	if err != nil {
		if os.IsNotExist(err) {
			credentials = []Credential{}
			return nil
		}
		return err
	}
	
	var encryptedCreds struct {
		Data string `json:"data"`
	}
	
	if err := json.Unmarshal(data, &encryptedCreds); err != nil {
		return err
	}
	
	// 解密数据
	decrypted, err := decrypt(encryptedCreds.Data)
	if err != nil {
		return err
	}
	
	if err := json.Unmarshal([]byte(decrypted), &credentials); err != nil {
		return err
	}
	
	return nil
}

// 保存凭证到文件
func saveCredentials() error {
	mu.RLock()
	defer mu.RUnlock()
	
	data, err := json.Marshal(credentials)
	if err != nil {
		return err
	}
	
	// 加密数据
	encrypted, err := encrypt(string(data))
	if err != nil {
		return err
	}
	
	encryptedCreds := struct {
		Data string `json:"data"`
	}{
		Data: encrypted,
	}
	
	encData, err := json.Marshal(encryptedCreds)
	if err != nil {
		return err
	}
	
	return os.WriteFile(dbFile, encData, 0600)
}

// 加密函数
func encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(encryptKey)
	if err != nil {
		return "", err
	}
	
	ciphertext := make([]byte, aes.BlockSize+len(plaintext))
	iv := ciphertext[:aes.BlockSize]
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}
	
	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[aes.BlockSize:], []byte(plaintext))
	
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// 解密函数
func decrypt(cryptoText string) (string, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(cryptoText)
	if err != nil {
		return "", err
	}
	
	block, err := aes.NewCipher(encryptKey)
	if err != nil {
		return "", err
	}
	
	if len(ciphertext) < aes.BlockSize {
		return "", errors.New("密文太短")
	}
	
	iv := ciphertext[:aes.BlockSize]
	ciphertext = ciphertext[aes.BlockSize:]
	
	stream := cipher.NewCFBDecrypter(block, iv)
	stream.XORKeyStream(ciphertext, ciphertext)
	
	return string(ciphertext), nil
}

// GetAllCredentials 获取所有凭证
func GetAllCredentials() []Credential {
	mu.RLock()
	defer mu.RUnlock()
	
	// 创建副本但不包含SecretKey
	result := make([]Credential, len(credentials))
	for i, cred := range credentials {
		result[i] = cred
		result[i].SecretKey = ""
	}
	
	return result
}

// AddCredential 添加新凭证
func AddCredential(cred Credential) (Credential, error) {
	mu.Lock()
	defer mu.Unlock()
	
	// 生成唯一ID
	cred.ID = generateID()
	cred.CreatedAt = time.Now()
	
	credentials = append(credentials, cred)
	if err := saveCredentials(); err != nil {
		return Credential{}, err
	}
	
	// 返回的凭证不包含SecretKey
	result := cred
	result.SecretKey = ""
	return result, nil
}

// GetCredential 获取单个凭证
func GetCredential(id string) (Credential, error) {
	mu.RLock()
	defer mu.RUnlock()
	
	for _, cred := range credentials {
		if cred.ID == id {
			// 返回的凭证不包含SecretKey
			result := cred
			result.SecretKey = ""
			return result, nil
		}
	}
	
	return Credential{}, errors.New("凭证未找到")
}

// GetCredentialWithSecret 获取包含密钥的凭证（仅供内部使用）
func GetCredentialWithSecret(id string) (Credential, error) {
	mu.RLock()
	defer mu.RUnlock()
	
	for _, cred := range credentials {
		if cred.ID == id {
			return cred, nil
		}
	}
	
	return Credential{}, errors.New("凭证未找到")
}

// DeleteCredential 删除凭证
func DeleteCredential(id string) error {
	mu.Lock()
	defer mu.Unlock()
	
	for i, cred := range credentials {
		if cred.ID == id {
			// 删除凭证
			credentials = append(credentials[:i], credentials[i+1:]...)
			return saveCredentials()
		}
	}
	
	return errors.New("凭证未找到")
}

// 生成唯一ID
func generateID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
} 