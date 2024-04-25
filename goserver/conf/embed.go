package conf

import (
	"embed"
)

//go:embed app.ini **/*
var Files embed.FS

// FileNames 返回指定路径下的文件列表, 包含子目录名
func FileNames(dir string) ([]string, error) {
	entries, err := Files.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	fileNames := make([]string, 0, len(entries))
	for _, entry := range entries {
		fileNames = append(fileNames, entry.Name())
	}
	return fileNames, nil
}
