package services

import (
	"context"
	"errors"
	"aws-ip-manager/backend/models"
	
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

// 创建AWS会话
func createAWSSession(credID string) (*ec2.Client, error) {
	cred, err := models.GetCredentialWithSecret(credID)
	if err != nil {
		return nil, err
	}
	
	// 创建凭证提供者
	staticProvider := credentials.NewStaticCredentialsProvider(
		cred.AccessKey,
		cred.SecretKey,
		"",
	)
	
	// 创建AWS配置
	cfg, err := config.LoadDefaultConfig(
		context.TODO(),
		config.WithRegion(cred.Region),
		config.WithCredentialsProvider(staticProvider),
	)
	if err != nil {
		return nil, err
	}
	
	// 创建EC2客户端
	return ec2.NewFromConfig(cfg), nil
}

// 列出EC2实例
func ListEC2Instances(credID string) ([]types.Instance, error) {
	client, err := createAWSSession(credID)
	if err != nil {
		return nil, err
	}
	
	result, err := client.DescribeInstances(context.TODO(), &ec2.DescribeInstancesInput{})
	if err != nil {
		return nil, err
	}
	
	var instances []types.Instance
	for _, reservation := range result.Reservations {
		instances = append(instances, reservation.Instances...)
	}
	
	return instances, nil
}

// 获取实例详情
func GetInstanceDetails(credID string, instanceID string) (types.Instance, error) {
	client, err := createAWSSession(credID)
	if err != nil {
		return types.Instance{}, err
	}
	
	input := &ec2.DescribeInstancesInput{
		InstanceIds: []string{instanceID},
	}
	
	result, err := client.DescribeInstances(context.TODO(), input)
	if err != nil {
		return types.Instance{}, err
	}
	
	if len(result.Reservations) == 0 || len(result.Reservations[0].Instances) == 0 {
		return types.Instance{}, errors.New("实例未找到")
	}
	
	return result.Reservations[0].Instances[0], nil
}

// 分配弹性IP
func AllocateElasticIP(credID string) (types.Address, error) {
	client, err := createAWSSession(credID)
	if err != nil {
		return types.Address{}, err
	}
	
	result, err := client.AllocateAddress(context.TODO(), &ec2.AllocateAddressInput{
		Domain: types.DomainTypeVpc,
	})
	if err != nil {
		return types.Address{}, err
	}
	
	// 获取完整的地址信息
	describeResult, err := client.DescribeAddresses(context.TODO(), &ec2.DescribeAddressesInput{
		AllocationIds: []string{*result.AllocationId},
	})
	if err != nil {
		return types.Address{}, err
	}
	
	if len(describeResult.Addresses) == 0 {
		return types.Address{}, errors.New("无法获取分配的弹性IP详情")
	}
	
	return describeResult.Addresses[0], nil
}

// 释放弹性IP
func ReleaseElasticIP(credID string, allocationID string) error {
	client, err := createAWSSession(credID)
	if err != nil {
		return err
	}
	
	_, err = client.ReleaseAddress(context.TODO(), &ec2.ReleaseAddressInput{
		AllocationId: aws.String(allocationID),
	})
	
	return err
}

// 关联弹性IP到实例
func AssociateElasticIP(credID string, instanceID string, allocationID string) (string, error) {
	client, err := createAWSSession(credID)
	if err != nil {
		return "", err
	}
	
	result, err := client.AssociateAddress(context.TODO(), &ec2.AssociateAddressInput{
		InstanceId:   aws.String(instanceID),
		AllocationId: aws.String(allocationID),
	})
	if err != nil {
		return "", err
	}
	
	return *result.AssociationId, nil
}

// 解除弹性IP关联
func DisassociateElasticIP(credID string, associationID string) error {
	client, err := createAWSSession(credID)
	if err != nil {
		return err
	}
	
	_, err = client.DisassociateAddress(context.TODO(), &ec2.DisassociateAddressInput{
		AssociationId: aws.String(associationID),
	})
	
	return err
}

// 列出所有弹性IP
func ListElasticIPs(credID string) ([]types.Address, error) {
	client, err := createAWSSession(credID)
	if err != nil {
		return nil, err
	}
	
	result, err := client.DescribeAddresses(context.TODO(), &ec2.DescribeAddressesInput{})
	if err != nil {
		return nil, err
	}
	
	return result.Addresses, nil
} 