package handlers

import (
	"net/http"
	
	"github.com/gin-gonic/gin"
	"aws-ip-manager/backend/models"
	"aws-ip-manager/backend/services"
)

// GetAllCredentials 获取所有凭证
func GetAllCredentials(c *gin.Context) {
	credentials := models.GetAllCredentials()
	c.JSON(http.StatusOK, gin.H{
		"credentials": credentials,
	})
}

// AddCredential 添加新凭证
func AddCredential(c *gin.Context) {
	var credential models.Credential
	
	if err := c.ShouldBindJSON(&credential); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
		return
	}
	
	// 验证必填字段
	if credential.Name == "" || credential.AccessKey == "" || credential.SecretKey == "" || credential.Region == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "所有字段都是必填的"})
		return
	}
	
	result, err := models.AddCredential(credential)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{"credential": result})
}

// GetCredential 获取单个凭证
func GetCredential(c *gin.Context) {
	id := c.Param("id")
	
	credential, err := models.GetCredential(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"credential": credential})
}

// DeleteCredential 删除凭证
func DeleteCredential(c *gin.Context) {
	id := c.Param("id")
	
	err := models.DeleteCredential(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "凭证已删除"})
}

// ListInstances 列出EC2实例
func ListInstances(c *gin.Context) {
	credID := c.Query("credential_id")
	if credID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少credential_id参数"})
		return
	}
	
	instances, err := services.ListEC2Instances(credID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"instances": instances})
}

// GetInstanceDetails 获取实例详情
func GetInstanceDetails(c *gin.Context) {
	credID := c.Query("credential_id")
	instanceID := c.Param("id")
	
	if credID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少credential_id参数"})
		return
	}
	
	instance, err := services.GetInstanceDetails(credID, instanceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"instance": instance})
}

// AllocateEIP 分配弹性IP
func AllocateEIP(c *gin.Context) {
	credID := c.Query("credential_id")
	
	if credID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少credential_id参数"})
		return
	}
	
	eip, err := services.AllocateElasticIP(credID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"elastic_ip": eip})
}

// ReleaseEIP 释放弹性IP
func ReleaseEIP(c *gin.Context) {
	type ReleaseRequest struct {
		CredentialID string `json:"credential_id" binding:"required"`
		AllocationID string `json:"allocation_id" binding:"required"`
	}
	
	var req ReleaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
		return
	}
	
	err := services.ReleaseElasticIP(req.CredentialID, req.AllocationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "弹性IP已释放"})
}

// AssociateEIP 关联弹性IP到实例
func AssociateEIP(c *gin.Context) {
	type AssociateRequest struct {
		CredentialID string `json:"credential_id" binding:"required"`
		AllocationID string `json:"allocation_id" binding:"required"`
	}
	
	instanceID := c.Param("id")
	var req AssociateRequest
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
		return
	}
	
	associationID, err := services.AssociateElasticIP(req.CredentialID, instanceID, req.AllocationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message":       "弹性IP已关联到实例",
		"association_id": associationID,
	})
}

// DisassociateEIP 解除弹性IP关联
func DisassociateEIP(c *gin.Context) {
	type DisassociateRequest struct {
		CredentialID  string `json:"credential_id" binding:"required"`
		AssociationID string `json:"association_id" binding:"required"`
	}
	
	var req DisassociateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
		return
	}
	
	err := services.DisassociateElasticIP(req.CredentialID, req.AssociationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "弹性IP关联已解除"})
} 